const js = require('@eslint/js');
const reactHooks = require('eslint-plugin-react-hooks');
const reactRefresh = require('eslint-plugin-react-refresh');

module.exports = [
  js.configs.recommended,
  {
    files: ['frontend/**/*.{js,jsx}', 'electron/**/*.{js,cjs,mjs}', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...js.configs.recommended.languageOptions?.globals,
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly'
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off'
    }
  },
  {
    files: ['backend/**/*.{js,cjs,mjs}', '**/*.cjs', 'test-*.js', '*-test.js', 'user-test.js'],
    languageOptions: {
      globals: {
        ...js.configs.recommended.languageOptions?.globals,
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        Buffer: 'readonly',
        __filename: 'readonly'
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
