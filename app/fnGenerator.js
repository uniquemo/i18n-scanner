const fs = require('fs');

const replace = (text, chinese, replaceString) => {
  let textArr = text.split(/i18next\.t\(.+?\)/);
  const newArr = JSON.parse(JSON.stringify(textArr));

  textArr.forEach((item, index, arr) => {
      arr[index] = item.replace(chinese, replaceString);
  });

  newArr.forEach((item, index, arr) => {
      if (item !== textArr[index]) {
          text = text.replace(item, textArr[index]);
      }
  })
  return text;
}

const i18nFnWrapperGenerator = (source = {}) => {
  const { message, type, filename, line, importStatement, callStatement, } = source;

  let left = type === 'jsx' ? '{' : '';
  let right = type === 'jsx' ? '}' : '';

  // 替换模板字符串
  if (type === 'template') {
    left = '${';
    right = '}';
  }

  const data = fs.readFileSync(filename, 'utf8');
  const arr = data.split('\n');

  const temp1 = arr[line - 1];
  const temp2 = arr[line];
  const replaceString = `${left}${callStatement}('${message}')${right}`;
  let chinese = message.replace(/\\"/g, '"');

  // 这里是为了匹配前后如果有引号的情况
  arr[line - 1] = replace(arr[line - 1], `"${chinese}"`, replaceString);
  if (temp1 === arr[line - 1]) {
      arr[line - 1] = replace(arr[line - 1], `'${chinese}'`, replaceString);
      if (temp1 === arr[line - 1]) {
          arr[line - 1] = replace(arr[line - 1], chinese, replaceString);
          if (temp1 === arr[line - 1]) {
              arr[line] = replace(arr[line], `"${chinese}"`, replaceString);
              if (temp2 === arr[line]) {
                  arr[line] = replace(arr[line], `'${chinese}'`, replaceString);
                  if (temp2 === arr[line]) {
                      arr[line] = replace(arr[line], chinese, replaceString);
                      if (temp2 === arr[line]) {
                          if (
                            arr[line].indexOf(message) !== -1
                              || arr[line - 1].indexOf(message) !== -1
                          ) {
                              console.log('失败，请手动替换', JSON.stringify(source, null, "\t"));
                              return 0;
                          }
                      }
                  }
              }
          }
      }
  }

  let result = arr.join('\n');

  fs.writeFileSync(filename, result, 'utf8');

  if (arr.indexOf(importStatement) === -1) {
    // 代表是否需要在头部引入 i18next 
    return true;
  }
};

module.exports = {
  i18nFnWrapperGenerator,
};
