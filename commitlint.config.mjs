/** @type {import('@commitlint/types').UserConfig} */
const config = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-start-with-emoji': ({ subject }) => {
          const trimmed = subject?.trim() ?? ''
          const ok =
            /^\p{Extended_Pictographic}/u.test(trimmed) ||
            /^:[a-z0-9_+-]+:/u.test(trimmed)
          return [
            ok,
            'subject must start with an emoji, e.g. "feat: ✨ featured products page" or "feat: :sparkles: featured products page"',
          ]
        },
      },
    },
  ],
  rules: {
    'subject-start-with-emoji': [2, 'always'],
  },
}

export default config
