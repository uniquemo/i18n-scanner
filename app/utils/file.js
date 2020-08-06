const fs = require('fs')

const readFile = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, content) => {
      if (err) return reject(err)
      resolve({ filePath: path, content })
    })
  })
}

const writeFile = (path, content) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, 'utf-8', (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}

module.exports = {
  readFile,
  writeFile
}
