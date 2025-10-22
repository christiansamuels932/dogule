import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const errorCodesFile = path.normalize(path.join(__dirname, 'packages/domain/src/error-codes.ts'));

const enforceDomainCodesPlugin = {
  rules: {
    'no-hardcoded-domain-codes': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce ErrorCode/LogCode enums instead of hard-coded domain codes',
        },
        schema: [],
        messages: {
          useEnum: 'Use ErrorCode or LogCode enum members instead of hard-coded domain codes.',
        },
      },
      create(context) {
        const filename = path.normalize(context.getFilename());

        if (filename === '<input>' || filename === '<text>') {
          return {};
        }

        if (filename.startsWith(path.join(__dirname, 'node_modules'))) {
          return {};
        }

        if (filename === errorCodesFile) {
          return {};
        }

        return {
          Literal(node) {
            if (typeof node.value !== 'string') {
              return;
            }

            if (!/^(ERR|LOG)_[A-Z0-9_]+$/.test(node.value)) {
              return;
            }

            if (node.parent && node.parent.type === 'TSEnumMember') {
              return;
            }

            context.report({ node, messageId: 'useEnum' });
          },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules']
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@dogule/domain-codes': enforceDomainCodesPlugin
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.stylistic.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...eslintConfigPrettier.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@dogule/domain-codes/no-hardcoded-domain-codes': 'error'
    }
  }
);
