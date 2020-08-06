const path = require('path')

const DEFAULT_CONFIG = {
  input: 'packages/**/*.{js,jsx,ts,tsx}',
  importStatement: `import i18next from 'i18next';`,
  callStatement: 'i18next.t',
  exclude: [],
  outDir: './',
  chdir: './'
}

const configHandler = () => {
  let config = {}

  try {
    // config = require(path.join(process.cwd(), 'i18n.config.json'))
    config = require(path.join(__dirname, '../../', 'i18n.config.json'))
  } catch (err) {
    console.log('Configuration i18n.config.json file is not provided, user default config instead!')
    config = DEFAULT_CONFIG
  }

  return { ...DEFAULT_CONFIG, ...config }
}

module.exports = {
  configHandler
}
