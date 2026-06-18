/**
 * NexusFinance ESLint Configuration
 * Enforces consistent code style and catches common bugs across the monorepo.
 */
module.exports = {
  root: true,                          // Don't look for eslint configs in parent directories
  parser: '@typescript-eslint/parser', // Use TypeScript-aware parser
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'import',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',                         // Must be last — disables formatting rules that conflict with prettier
  ],
  settings: {
    react: { version: 'detect' },      // Auto-detect installed React version
  },
  rules: {
    // TypeScript-specific
    '@typescript-eslint/explicit-function-return-type': 'off',     // Allow inferred return types
    '@typescript-eslint/no-explicit-any': 'warn',                  // Warn but don't block 'any'
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-non-null-assertion': 'warn',           // Warn on ! assertions

    // React
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',

    // React Hooks
    'react-hooks/rules-of-hooks': 'error',    // Hooks must follow the Rules of Hooks
    'react-hooks/exhaustive-deps': 'warn',    // Warn about missing hook dependencies

    // Imports
    'import/order': 'off',
    'import/no-duplicates': 'warn',

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],  // Use logger, not console.log
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],    // Always use === not ==
  },
  overrides: [
    {
      // Looser rules for test files
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'no-console': 'off',
      },
    },
  ],
};
