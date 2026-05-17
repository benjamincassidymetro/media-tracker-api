import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['node_modules/', 'backend/dist/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  perfectionist.configs['recommended-natural'],
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Sorting object literal keys is too aggressive for data files and config objects
      'perfectionist/sort-objects': 'off',
      // Module-level declaration order cannot be sorted alphabetically when declarations
      // depend on one another (e.g. helper used by another helper defined later)
      'perfectionist/sort-modules': 'off',
    },
  },
)
