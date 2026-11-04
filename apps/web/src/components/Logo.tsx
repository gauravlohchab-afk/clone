import { brand } from '../lib/brand';

/** Original VYRO mark: a V cut from two planes, with a coral spark. */
export function Mark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M8 13h12.5L32 41.5 43.5 13H56L38.6 53H25.4z" fill="#B6FF4A" />
      <path d="M32 41.5 25.4 53h13.2z" fill="#7558FF" />
      <circle cx="52" cy="8.5" r="5" fill="#FF5C45" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark size={28} />
      <span className="font-display text-xl font-bold tracking-[0.12em]">{brand.name}</span>
    </span>
  );
}
