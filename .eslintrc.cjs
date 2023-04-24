// https://eslint.org/docs/user-guide/configuring

module.exports = {
  parser: "vue-eslint-parser",
  parserOptions: {
    // parser: "@babel/eslint-parser",
    // parser: "vue-eslint-parser",
    parser: "@typescript-eslint/parser",
    // ecmaVersion: "latest",
    // ecmaVersion: "2018-09",
    ecmaVersion: 2020,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    "vue",
    "prettier",
    "@typescript-eslint"
  ],
  env: {
    node: true,
    es6: true,
    browser: true,
    es2021: true,
    "vue/setup-compiler-macros": true
  },
  globals: {
    Markdown: true
  },
  extends: [
    "plugin:vue/vue3-recommended",
    "eslint:recommended",
    "airbnb-base",
    "plugin:prettier/recommended"
    // "plugin:@typescript-eslint/eslint-recommended",
    // "plugin:@typescript-eslint/recommended"
  ],
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".vue"]
      },
      alias: {
        map: [["@", "./src"]],
        extensions: [".js", ".jsx", ".json", ".ts", ".tsx", ".vue"]
      }
    }
  },
  // add your custom rules here
  rules: {
    // 启用 prettier 插件检查代码格式。
    "prettier/prettier": "warn",
    "func-names": "off",
    "import/extensions": "off",
    "consistent-return": "off",
    "comma-dangle": "off",
    "arrow-parens": "off",
    "arrow-body-style": "off",
    "prefer-destructuring": "off",
    "prefer-template": "off",
    "no-param-reassign": "off",
    "bracket-same-line": 0,
    "operator-linebreak": "off",
    "object-curly-newline": "off",
    // allow async-await
    "generator-star-spacing": "off",
    // 允许使用 console 对象
    "no-console": "off",
    // allow async-await
    // 'no-async-promise-executor': 'off',
    // 允许声明后未被使用的变量或参数
    "no-unused-vars": "off",
    "no-bitwise": "off",
    // 'vue/require-default-prop': 'off',
    "import/prefer-default-export": "off",
    // "max-classes-per-file": [
    //   "error",
    //   { "ignoreExpressions": true, "max": 2 }
    // ],
    "max-classes-per-file": ["error", 4],
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: ["vite.config.ts"]
      }
    ]
  }
};
