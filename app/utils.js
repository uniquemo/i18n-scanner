const path = require('path');
const { defaultConfig } = require('./constant');

const hasCNChar = (str) =>
  /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B\u3400-\u4DB5\u4E00-\u9FD5\uF900-\uFA6D\uFA70-\uFAD9]/.test(
    str
  );

const configHandler = () => {
  let config = {};

  try {
    config = require(path.join(process.cwd(), 'i18n.config.json'));
  } catch (err) {
    console.error('配置文件有错 => ', err)
    config = defaultConfig;
  }

  return { ...defaultConfig, ...config };
};

module.exports = {
  hasCNChar,
  configHandler,
};
