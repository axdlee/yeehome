module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    'vue'
  ],
  rules: {
    // 代码风格
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'quotes': ['error', 'single'],
    'semi': ['error', 'never'],
    'comma-dangle': ['error', 'never'],

    // 最佳实践
    'no-console': 'off',
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-undef': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],

    // Vue规则
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/require-default-prop': 'warn',
    'vue/require-prop-types': 'warn',

    // 允许的模式
    'no-prototype-builtins': 'off'
  },
  globals: {
    window: 'readonly',
    document: 'readonly',
    electron: 'readonly'
  }
}
