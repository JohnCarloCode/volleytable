/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Adobe Creative Cloud (registro oscuro de app) + rojo de marca
        ink: '#1B1B1B', // app-canvas (fondo)
        panel: '#252525', // app-surface-1 (cabecera / banquillos / modal)
        elev: '#303030', // app-surface-2 (inputs, chips, botones)
        elevh: '#3a3a3a', // hover
        hairline: '#404040', // app-border
        txt: '#EBEBEB', // app-ink
        muted: '#8f8f8f',
        accent: '#FA0F00', // rojo Adobe (marca, no aviso)
        accenth: '#E00D00',
        danger: '#D31510',
        link: '#0265DC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '4px',
        lg: '8px',
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.12)',
        elevated: '0 4px 16px rgba(0,0,0,0.15)',
        appElevated: '0 8px 32px rgba(0,0,0,0.5)',
        panel: '0 -1px 0 rgba(255,255,255,0.04)',
      },
      transitionTimingFunction: {
        spectrum: 'cubic-bezier(0.45, 0, 0.40, 1)',
      },
    },
  },
  plugins: [],
}
