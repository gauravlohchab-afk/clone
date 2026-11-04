import { Loader2 } from 'lucide-react';
export function FullPageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <Loader2 className="size-6 animate-spin text-muted" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
