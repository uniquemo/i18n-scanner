const path = require('path')
const glob = require('glob')
const fs = require('fs')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default

const { readFile, writeFile } = require('./utils/file')
const { hasCNChar } = require('./utils/is')
const { configHandler } = require('./utils/config')
const { genNodeLocation } = require('./utils/node')
const { i18nFnWrapperGenerator } = require('./fnGenerator')
const { NODE_TYPE } = require('./constant')

const { JSX, TEMPLATE, STRING, JSX_ATTRIBUTE, CALL_EXPRESSION } = NODE_TYPE

// 修改当前工作目录
process.chdir(configHandler().chdir)

/**
 * texts: ['text#type#filePath#lineStart#lineEnd#colStart']
 * textMap: {
 *   text: {
 *     message: text,
 *     source: [
 *       {
 *         type,
 *         location: 'filePath#lineStart#lineEnd#colStart',
 *         isWrapped: true/false
 *       }
 *     ]
 *   }
 * }
 */
class I18nScanner {
  constructor() {
    this.config = configHandler()
    this.texts = []
    this.textMap = new Map()
    this.root = process.cwd()
  }

  getInputFilesContent = async () => {
    const { input, exclude } = this.config

    return new Promise((resolve, reject) => {
      glob(
        input,
        {
          cwd: this.root,
          ignore: exclude,
        },
        (err, files = []) => {
          if (err) return reject(err)
          // 返回所有文件路径和内容
          resolve(
            Promise.all(
              files
                .filter(file => !file.includes('node_modules'))
                .map(async (file) => await readFile(file))
            )
          )
        }
      )
    })
  }

  detectChinese = (path, filePath, type) => {
    const { node, parent } = path
    let val = node.value
  
    // type: TemplateElement 
    if (val && typeof val === 'object') {
      val = val.cooked
    }
  
    if (!hasCNChar(val)) return

    val = val.trim().replace(/\n\s*/g, ' ')
    const location = genNodeLocation(node, filePath)
    const sourceText = `${val}#${type}#${location}`
    let isExisted = false
  
    if (
      [STRING, TEMPLATE].includes(type) &&
      this.texts.find(t =>
        t === `${val}#${STRING}#${location}` ||
        t === `${val}#${TEMPLATE}#${location}` ||
        t === `${val}#${JSX}#${location}`
      )
    ) {
      isExisted = true
    } else if (type === JSX && this.texts.indexOf(`${val}#${JSX}#${location}`) > -1) {
      isExisted = true
    }

    // 判断是否已经包裹了i18n方法
    let isWrapped = false
    if (
      type === STRING &&
      parent.type === CALL_EXPRESSION &&
      (
        parent.callee.name === this.config.callStatement ||
        (parent.callee.property && parent.callee.property.name === this.config.callStatement)
      )
    ) {
      isWrapped = true
    }
  
    if (!isExisted) {
      this.texts.push(sourceText)
      if (this.textMap.has(val)) {
        const d = this.textMap.get(val)
  
        d.source.push({ type, location, isWrapped })
        this.textMap.set(val, d)
        return
      }
      this.textMap.set(val, {
        message: val,
        source: [
          { type, location, isWrapped }
        ]
      })
    }
  }

  parse = ({ filePath, content }) => {
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
      ]
    })
  
    traverse(
      ast,
      {
        JSXText: (path) => {
          this.detectChinese(path, filePath, JSX)
        },
        'TemplateLiteral|TemplateElement': (path) => {
          this.detectChinese(path, filePath, TEMPLATE)
        },
        StringLiteral: (path) => {
          const { parent = {} } = path
          this.detectChinese(path, filePath, parent.type === JSX_ATTRIBUTE ? JSX : STRING)
        }
      }
    )
  }

  genTranslationFile = (files) => {
    for (let file of files) {
      this.parse(file)
    }
  
    console.log('Total text count is: ', this.textMap.size)
    const zhJson = [...this.textMap.values()].reduce((json, item) => {
      json[item.message] = item.message
      return json
    }, {})
  
    fs.writeFileSync(
      path.join(this.root, this.config.outDir, 'translation.json'),
      JSON.stringify(zhJson, null, 2)
    )
  }

  insertImportStatement = async (filePath) => {
    try {
      const { content } = await readFile(filePath)
      await writeFile(filePath, `${this.config.importStatement}\n${content}`)
    } catch (err) {
      console.error(err)
    }
  }

  wrapWithI18nFn = () => {
    const needImport = []

    // 将文案用i18n方法包裹
    this.textMap.forEach((item) => {
      item.source.forEach((src) => {
        const [filePath, lineStart, lineEnd, column] = src.location.split('#')
        const shouldImport = i18nFnWrapperGenerator({
          filePath,
          lineStart,
          lineEnd,
          column,
          message: item.message,
          type: src.type,
          isWrapped: src.isWrapped,
          callStatement: this.config.callStatement,
          importStatement: this.config.importStatement
        })

        if (shouldImport) needImport.push(filePath)
      })
    })

    // 加上文件头的importStatement
    needImport.forEach(src => this.insertImportStatement(src))
  }

  start = async () => {
    try {
      const files = await this.getInputFilesContent()
      this.genTranslationFile(files)
      this.wrapWithI18nFn()
    } catch(err) {
      console.log(err)
    }
  }
}

new I18nScanner().start()
