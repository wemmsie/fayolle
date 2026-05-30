// Auto-discovers all images in the funky/ folder.
// To add images, just drop files named funky-N.{jpg,jpeg,png,webp} here — no code changes needed.
const modules = import.meta.glob('./funky/funky-*.{jpg,jpeg,png,webp}', { eager: true });

export const funkyImages = Object.entries(modules)
  .sort(([a], [b]) => {
    const n = (s) => parseInt(s.match(/funky-(\d+)/)?.[1] ?? '0', 10);
    return n(a) - n(b);
  })
  .map(([, mod]) => mod.default);
