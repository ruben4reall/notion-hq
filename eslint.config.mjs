import nextConfig from 'eslint-config-next'

export default [
  ...nextConfig,
  {
    rules: {
      // Warn when accented characters appear directly in JSX text nodes (hardcoded i18n text)
      'no-restricted-syntax': [
        'warn',
        {
          selector: "JSXText[value=/[\\u00C0-\\u00D6\\u00D8-\\u024F]/]",
          message: "Hardcoded accented text in JSX — use t('key') from useLanguage() instead.",
        },
      ],
    },
  },
]
