const path = require('path')
const get = require('lodash/get')

/**
 * 返回location：文件路径#节点所在行#节点所在列
 * @param {*} node Babel node
 * @param {*} filePath 文件路径
 */
const genNodeLocation = (node, filePath) => {
  const lineStart = get(node, ['loc', 'start', 'line'], '!!!')
  const lineEnd = get(node, ['loc', 'end', 'line'], '!!!')
  const colStart = get(node, ['loc', 'start', 'column'], '!!!')
  const location = `${path.join(process.cwd(), filePath)}#${lineStart}#${lineEnd}#${colStart}`

  return location
}

module.exports = {
  genNodeLocation
}
