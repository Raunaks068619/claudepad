import { createTheme } from '@mantine/core'

/**
 * ClaudePad theme — dark, with a warm "Claude clay" accent so the app feels
 * on-brand next to Claude Desktop. Kept intentionally small; component-level
 * styling lives in *.module.css.
 */
export const theme = createTheme({
  primaryColor: 'clay',
  primaryShade: { light: 6, dark: 5 },
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontWeight: '650'
  },
  colors: {
    // A soft terracotta/clay ramp (10 shades, light -> dark).
    clay: [
      '#fbeee9',
      '#f2d6cb',
      '#e6b6a4',
      '#dc957c',
      '#d47a5b',
      '#cf6a48', // primary (dark)
      '#c15a3a',
      '#a04a30',
      '#7f3b27',
      '#5f2c1d'
    ]
  }
})
