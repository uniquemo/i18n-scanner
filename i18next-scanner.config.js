const path = require('path')
const fs = require('fs')
const typescript = require('typescript')

module.exports = {
    input: [
        'app/**/*.{js,jsx,ts,tsx}',
        '!app/**/*.spec.{js,jsx,ts,tsx}',
        '!node_modules/**',
    ],
    output: './',
    options: {
        debug: true,
        func: {
            list: ['i18next.t', 't'],
            extensions: [],
        },
        trans: {
            component: 'Trans',
            i18nKey: 'i18nKey',
            extensions: [],
            fallbackKey: function(ns, value) {
                return value
            },
            acorn: {
                ecmaVersion: 10,
                sourceType: 'module',
            }
        },
        lngs: ['zh_CN'],
        resource: {
            loadPath: 'app/i18n/{{lng}}/{{ns}}.json',
            savePath: 'app/i18n/{{lng}}/{{ns}}.json',
            jsonIndent: 2,
            lineEnding: '\n'
        },
        defaultValue: '',
        nsSeparator: false,
        keySeparator: false,
        removeUnusedKeys: true,
    },
    transform: function customTransform(file, enc, done) {
        const parser = this.parser;
        const { ext } = path.parse(file.path);
        const extensions = ['.js', '.jsx', '.ts', '.tsx'];
        const content = fs.readFileSync(file.path, enc);
        const fileName = path.basename(file.path);

        if (extensions.includes(ext) && !/\.d\.ts$/.test(fileName)) {
            const { outputText } = typescript.transpileModule(content.toString(), {
                compilerOptions: { target: 'es2018' },
                fileName,
            });

            parser.parseTransFromString(outputText);
            parser.parseFuncFromString(outputText, (key) => {
                parser.set(key, key)
            });
        }
    
        done();
    },
};
