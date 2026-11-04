/** Initial-based avatar until profile photos arrive with media storage. Colour derives from the username. */
const swatches = ['bg-lime-500 text-ink-900', 'bg-violet-500 text-paper-50', 'bg-coral-500 text-ink-900', 'bg-paper-300 text-ink-900'];

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  const n = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold ${swatches[n % swatches.length]}`} style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {(name[0] ?? '?').toUpperCase()}
    </span>
  );
}
