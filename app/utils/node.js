const path = require('path')
const get = require('lodash/get')

/**
 * 返回location：文件路径#节点所在行#节点所在列
 * @param {*} node Babel node
 * @param {*} filePath 文件路径
 */
const genNodeLocation = (node, filePath) => {
  const locStart = get(node, ['loc', 'start', 'line'], '!!!')
  const locEnd = get(node, ['loc', 'end', 'line'], '!!!')
  const realLine = locStart === locEnd ? locStart : Math.ceil((locStart + locEnd) / 2)
  const locCol = get(node, ['loc', 'start', 'column'], '!!!')
  const location = `${path.join(process.cwd(), filePath)}#${realLine}#${locCol}`

  return location
}

module.exports = {
  genNodeLocation
}
