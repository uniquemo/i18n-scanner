const fs = require('fs')

const replace = (lineText, chinese, replaceString) => {
  lineText = lineText.replace(chinese, replaceString)
  return lineText
}

const i18nFnWrapperGenerator = (source = {}) => {
  const {
    type,
    line,
    message,
    filePath,
    isWrapped,
    importStatement,
    callStatement
  } = source

  let left = type === 'jsx' ? '{' : ''
  let right = type === 'jsx' ? '}' : ''

  if (type === 'template') {
    left = '${'
    right = '}'
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const arr = content.split('\n')

  const temp = arr[line - 1]
  const replaceString = `${left}${callStatement}('${message}')${right}`
  let chinese = message.replace(/\\"/g, '"')

  const checkIfNeedImport = () => {
    let result = arr.join('\n')
    fs.writeFileSync(filePath, result, 'utf-8')

    if (arr.indexOf(importStatement) === -1) {
      // 是否需要在头部引入importStatement
      return true
    }
  }

  // 判断是否已经用i18n函数包裹了
  if (isWrapped) {
    return checkIfNeedImport()
  }

  // 匹配前后如果有引号的情况
  arr[line - 1] = replace(arr[line - 1], `"${chinese}"`, replaceString)
  if (temp === arr[line - 1]) {
    arr[line - 1] = replace(arr[line - 1], `'${chinese}'`, replaceString)
    if (temp === arr[line - 1]) {
      arr[line - 1] = replace(arr[line - 1], chinese, replaceString)
      if (temp === arr[line - 1] && arr[line - 1].indexOf(message) !== -1) {
        console.log('失败，请手动替换', JSON.stringify(source, null, 2))
        return false
      }
    }
  }

  return checkIfNeedImport()
}

module.exports = {
  i18nFnWrapperGenerator,
};
