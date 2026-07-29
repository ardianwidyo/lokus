/**
 * WCAG 2.2 relative luminance and contrast ratio.
 *
 * Used by the accessibility test to check the token palette rather than trust
 * that the pairs in design/UI-GUIDELINES.md were chosen correctly. The
 * guidelines state that body-sized accent text must use --color-accent-700
 * because the base accent is only 3:1; that claim is now checked by arithmetic.
 *
 * https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */

export function parseColor(hex) {
  const value = String(hex).trim().replace('#', '');
  const full =
    value.length === 3
      ? value.split('').map((c) => c + c).join('')
      : value;

  if (!/^[0-9a-f]{6}$/i.test(full)) {
    throw new Error(`Not a hex colour: ${hex}`);
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function channelLuminance(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance({ r, g, b }) {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [lighter, darker] = a > b ? [a, b] : [b, a];

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}
