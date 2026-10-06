import next from 'eslint-config-next'
import boundaries from 'eslint-plugin-boundaries'
import i18next from 'eslint-plugin-i18next'

const eslintConfig = [
  ...next,
  {
    rules: {
      // Enforce the "import only through barrels / no deep cross-feature imports" rule.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message:
                'Do not import internals of another feature. Import from the feature barrel: "@/features/<feature>".'
            }
          ]
        }
      ]
    }
  },
  {
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': 'warn'
    }
  },
  {
    // shadcn primitives are vendored: their sr-only / default labels are overridden by callers.
    files: ['src/shared/components/ui/**'],
    rules: { 'i18next/no-literal-string': 'off' }
  },
  {
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/ignore': ['src/proxy.ts', 'src/global.d.ts', 'src/**/*.d.ts'],
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**/*' },
        {
          type: 'feature',
          pattern: 'src/features/*',
          mode: 'folder',
          capture: ['feature']
        },
        { type: 'shared', pattern: 'src/shared/**/*' },
        { type: 'i18n', pattern: 'src/i18n/**/*' }
      ]
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message: '{{from.type}} is not allowed to import {{to.type}} — see docs/ARCHITECTURE.md',
          rules: [
            {
              from: { type: 'app' },
              allow: { to: { type: ['app', 'feature', 'shared', 'i18n'] } }
            },
            {
              from: { type: 'feature' },
              allow: [
                { to: { type: ['shared', 'i18n'] } },
                {
                  to: {
                    type: 'feature',
                    captured: { feature: '{{from.captured.feature}}' }
                  }
                }
              ]
            },
            {
              from: { type: 'shared' },
              allow: { to: { type: ['shared', 'i18n'] } }
            },
            {
              from: { type: 'i18n' },
              allow: { to: { type: ['i18n', 'shared'] } }
            }
          ]
        }
      ]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ]
    }
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts']
  }
]

export default eslintConfig
