const p = require('path');
const glob = require('glob');
const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const get = require('lodash/get');

const { hasCNChar, configHandler } = require('./utils');
const { i18nFnWrapperGenerator } = require('./fnGenerator');

// 设置配置文件
const {
  input = 'packages/**/*.{js,jsx,ts,tsx}',
  exclude = [],
  outDir,
  callStatement,
  importStatement,
} = configHandler();

process.chdir('../vcs-frontend');

// 存储匹配到的包含中文字符串及路径行号等信息
const texts = [];
// 存储匹配到的包含中文字符的节点信息
const textMap = new Map();
const root = process.cwd();

const readFile = (path) => 
  new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, content) => {
      if (err) return reject(err);
      resolve({ filePath: path, content });
    });
  });

// 读取 input 中的文件
const start = () =>
  new Promise((resolve, reject) => {
    glob(
      input,
      {
        cwd: root,
        ignore: exclude,
      },
      (err, files = []) => {
        if (err) {
          return reject(err);
        }
        resolve(
          // 返回所有文件路径和内容
          Promise.all(
            files
              .filter(file => !file.includes('node_modules'))
              .map(async (file) => await readFile(file))
          )
        );
      }
    );
  });

const detectChinese = (node, filePath, type) => {
  let val = node.value;

  // type: TemplateElement 
  if (val && typeof val === 'object') {
    val = val.cooked;
  }
  if (!hasCNChar(val)) return;

  const locStart = get(node, ['loc', 'start', 'line'], '!!!');
  const locEnd = get(node, ['loc', 'end', 'line'], '!!!');
  const realLine = locStart === locEnd ? locStart : Math.ceil((locStart + locEnd) / 2);
  const locCol = get(node, ['loc', 'start', 'column'], '!!!');
  const location = `${p.join(root, filePath)}#${realLine}#${locCol}`;

  val = type === 'jsx' ? val.trim() : val;
  const sourceText = `${val}#${type}#${location}`;
  let isExist = false;

  if (
    ['string', 'template'].includes(type)
    && texts.find(t => 
        t === `${val}#string#${location}`
        || t === `${val}#template#${location}`
        || t === `${val}#jsx#${location}`
      )
  ) {
      isExist = true;
  } else if (type === 'jsx' && texts.indexOf(`${val}#jsx#${location}`) > -1) {
      isExist = true;
  }

  // 资源没有扫描过
  if (!isExist) {
    texts.push(sourceText);
    // 将文案存入 textMap 中
    if (textMap.has(val)) {
      const d = textMap.get(val)

      d.source.push({ type, location });
      textMap.set(val, d);
      return;
    }
    textMap.set(val, {
      message: val,
      source: [
        { type, location },
      ],
    });
  }
};

const parse = ({ filePath, content }) => {
  const ast = parser.parse(content, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
      'objectRestSpread',
      'dynamicImport',
      'decorators-legacy',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'asyncGenerators',
      'classPrivateMethods',
      'classPrivateProperties',
      'classProperties',
    ],
  });

  traverse(
    ast,
    {
      JSXText(path) {
        detectChinese(path.node, filePath, 'jsx');
      },
      'TemplateLiteral|TemplateElement'(path) {
        detectChinese(path.node, filePath, 'template');
      },
      StringLiteral(path) {
        const { node, parent = {} } = path;

        detectChinese(node, filePath, parent.type === 'JSXAttribute' ? 'jsx' : 'string');
      },
    }
  );
};

start()
  .catch((err) => { throw new Error('err') })
  .then((files) => {
    for (let file of files) {
      parse(file)
    }

    return [...textMap.values()];
  })
  .then((messages) => {
    // 生成文案映射文件
    console.log(textMap.size)
    const zhJson = messages.reduce((total, item) => {
      total[item.message] = item.message;
      return total;
    }, {});

    fs.writeFileSync(p.join(root, outDir, 'translation.json'), JSON.stringify(zhJson, null, '\t'));
  })
  .then(() => {
    const needImport = [];

    // 替换中文文案, 将文案中i18方法包裹
    textMap.forEach((item) => {
      item.source.forEach((src) => {
        const [filename, line, column] = src.location.split('#')
        const shouldImport = i18nFnWrapperGenerator({
          filename,
          line,
          column,
          message: item.message,
          type: src.type,
          callStatement,
          importStatement,
        });

        if (shouldImport) needImport.push(filename);
      })
    })

    // 这里加上文件头的import
    needImport.forEach(src => {
      fs.readFile(src, 'utf8', (err, data) => {
          if (err) return console.log(err);

          const result = `${importStatement}\n${data}`;
          fs.writeFile(src, result, 'utf8', e => {
              if (e) return console.log(e);
              return;
          });
          return;
      });
    });

  })
  .catch(e => {
    console.log(e)
  })

module.exports = {
  start,
};
