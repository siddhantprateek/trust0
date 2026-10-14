// Matches Clerk's components to the studio theme in index.css. Clerk derives color scales from these
// literal values rather than CSS variables, so light and dark need their own copies.
//
// colorBackground is the *page* background (--background), not the card background (--card): in light mode
// those happen to be the same value, which is why this only ever looked wrong in dark mode. Clerk's own card,
// nav and popovers all derive their fill from this token, so matching it to the page is what makes the whole
// widget blend into the page instead of floating as a visibly different, raised panel.
const palettes = {
  light: {
    colorPrimary: 'rgb(126, 71, 255)',
    colorPrimaryForeground: 'rgb(255, 255, 255)',
    colorForeground: 'rgb(0, 0, 0)',
    colorMutedForeground: 'rgb(82, 82, 82)',
    colorBackground: 'rgb(253, 253, 253)', // --background
    colorInput: 'rgb(245, 245, 245)', // --muted, so fields stay visible against the now-matching page/card bg
    colorBorder: 'rgb(253, 253, 253)', // == colorBackground: no visible seam around the card
    colorDanger: 'rgb(229, 75, 79)',
  },
  dark: {
    colorPrimary: 'rgb(140, 92, 255)',
    colorPrimaryForeground: 'rgb(255, 255, 255)',
    colorForeground: 'rgb(240, 240, 240)',
    colorMutedForeground: 'rgb(160, 160, 160)',
    colorBackground: 'rgb(26, 27, 30)', // --background (was --card, the mismatch that showed up in dark mode)
    colorInput: 'rgb(42, 44, 51)', // --muted
    colorBorder: 'rgb(26, 27, 30)', // == colorBackground: no visible seam around the card
    colorDanger: 'rgb(248, 113, 113)',
  },
} as const

export function clerkAppearance(resolvedTheme: string | undefined) {
  return {
    cssLayerName: 'clerk',
    baseTheme: undefined,
    variables: {
      ...palettes[resolvedTheme === 'dark' ? 'dark' : 'light'],
      borderRadius: '0.625rem',
      fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    },
    elements: {
      // Belt-and-braces on top of the matched colorBackground/colorBorder above: force every outer surface
      // transparent and borderless too, with "!" so it wins even if Clerk sets these inline. "card" is the
      // actual bordered/shadowed/filled box ("cardBox" is just its layout wrapper).
      rootBox: 'w-full',
      cardBox: 'w-full shadow-none!',
      card: 'w-full border-0! bg-transparent! shadow-none!',
      navbar: 'bg-transparent! shadow-none!',
      scrollBox: 'bg-transparent! shadow-none!',
      pageScrollBox: 'bg-transparent! shadow-none!',
      profileSection: 'shadow-none!',
      popoverBox: 'shadow-none!',
    },
  }
}
