/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // PawStay — sitter (default) palette. For host (anbieter) styling,
        // resolve through ThemeContext / useAppTheme() instead of Tailwind.
        background:           '#FBF8F0',  // warm cream
        surface:              '#FFFFFF',
        'surface-variant':    '#E2F0DA',
        'surface-dim':        '#D2E5C9',
        primary:              '#6DB88E',
        'primary-light':      '#A8D6BB',
        'primary-container':  '#C5E8C9',
        secondary:            '#6BAAB2',
        'secondary-container':'#C2E4E8',
        tertiary:             '#9AAD78',
        'tertiary-container': '#D8E8C0',
        text:                 '#1C1B1F',
        muted:                '#49454F',
        subtle:               '#79747E',
        border:               '#C9E2BF',
        'border-muted':       '#ADCD9F',
        success:              '#4CAF7D',
        warning:              '#E8A838',
        error:                '#C0627A',
        'error-container':    '#FFDAD6',

        // Host-mode tokens (use sparingly; prefer ThemeContext)
        'host-background':           '#FAF6ED',
        'host-surface-variant':      '#DCE8D5',
        'host-primary':              '#2D6A4F',
        'host-primary-container':    '#B8D4BA',
        'host-border':               '#9CC4A4',
      },
      fontFamily: {
        sans:     ['Nunito_400Regular'],
        bold:     ['Nunito_700Bold'],
        semibold: ['Nunito_600SemiBold'],
        light:    ['Nunito_300Light'],
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
