import js from '@eslint/js';
import checkFile from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'check-file': checkFile
    },
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      importPlugin.flatConfigs.recommended,
      eslintPluginPrettierRecommended,
      eslintConfigPrettier
    ],
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['off', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.{ts,tsx}': 'KEBAB_CASE'
        },
        {
          ignoreMiddleExtensions: true
        }
      ],
      'check-file/folder-naming-convention': [
        'error',
        {
          'src/**/!(__tests__)/*': 'KEBAB_CASE'
        }
      ],
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
      'import/no-unresolved': 'off',
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // disables cross-feature imports:
            // eg. src/features/discussions should not import from src/features/comments, etc.

            // enforce unidirectional codebase:

            // e.g. src/app can import from src/features but not the other way around
            {
              target: './src/features',
              from: './src/app'
            },

            // e.g src/features and src/app can import from these shared modules but not the other way around
            {
              target: ['./src/shared', './src/hooks', './src/lib', './src/context', './src/config'],
              from: ['./src/features', './src/app']
            }
          ]
        }
      ],
      'prettier/prettier': [
        'error',
        {},
        {
          usePrettierrc: true
        }
      ]
    }
  }
);
