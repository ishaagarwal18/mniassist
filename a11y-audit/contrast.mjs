// Small WCAG contrast-ratio calculator so token replacements are computed,
// not eyeballed. Usage: node contrast.mjs "#7B8794" "#FFFFFF"
function srgbToLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}
function luminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function ratio(hex1, hex2) {
  const l1 = luminance(hexToRgb(hex1));
  const l2 = luminance(hexToRgb(hex2));
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}
function composite(fgHex, alpha, bgHex) {
  const [fr, fg, fb] = hexToRgb(fgHex);
  const [br, bg, bb] = hexToRgb(bgHex);
  const mix = (f, b) => Math.round(f * alpha + b * (1 - alpha));
  const r = mix(fr, br), g = mix(fg, bg), b = mix(fb, bb);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

const [, , cmd, ...args] = process.argv;

if (cmd === 'composite') {
  const [fg, alpha, bg] = args;
  const c = composite(fg, parseFloat(alpha), bg);
  console.log(`${fg} @ ${alpha} over ${bg} = ${c} — ratio vs ${bg}: ${ratio(c, bg).toFixed(2)}`);
} else {
  const [fg, bg] = [cmd, args[0]];
  console.log(`${fg} on ${bg}: ${ratio(fg, bg).toFixed(2)}`);
}
