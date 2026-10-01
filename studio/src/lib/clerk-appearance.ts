// Matches Clerk's components to the studio theme in index.css.
// Clerk derives color scales from these, so they are literal values rather than CSS variables.
export const clerkAppearance = {
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: 'rgb(126, 71, 255)',
    colorPrimaryForeground: 'rgb(255, 255, 255)',
    colorForeground: 'rgb(0, 0, 0)',
    colorMutedForeground: 'rgb(82, 82, 82)',
    colorBackground: 'rgb(253, 253, 253)',
    colorInput: 'rgb(253, 253, 253)',
    colorBorder: 'rgb(231, 231, 238)',
    colorDanger: 'rgb(229, 75, 79)',
    borderRadius: '0.625rem',
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    // Sit flush in our layout instead of floating in a shadowed card
    cardBox: 'shadow-none border border-border',
  },
}
