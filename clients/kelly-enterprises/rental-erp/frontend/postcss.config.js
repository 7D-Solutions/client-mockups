export default {
  plugins: {
    'postcss-import': {},
    'postcss-preset-env': {
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': true,
      },
    },
    // Temporarily disable PurgeCSS as it's removing CSS module classes
    // TODO: Configure PurgeCSS to properly detect CSS module patterns
    // ...(process.env.NODE_ENV === 'production' && {
    //   'postcss-purgecss': {
    //     content: [
    //       './index.html',
    //       './src/**/*.{js,jsx,ts,tsx}',
    //     ],
    //   },
    // }),
    'cssnano': {
      preset: 'default',
    },
    autoprefixer: {},
  },
}