import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal: focus moves in on open, Escape and backdrop close it,
 * Tab is kept inside, and focus returns to the opener on close.
 */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>('button, a, input, [tabindex]:not([tabindex="-1"])');
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key !== 'Tab' || !panel.current) return;
      const nodes = [...panel.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled)')];
      if (!nodes.length) return;
      const [a, z] = [nodes[0]!, nodes[nodes.length - 1]!];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/60 sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-xl border border-line bg-surface p-5 shadow-xl outline-none sm:max-w-md sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-fg"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
