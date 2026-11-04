import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const tones = {
  error: { cls: 'border-danger/50 text-danger', Icon: AlertCircle },
  success: { cls: 'border-lime-600/60 text-fg', Icon: CheckCircle2 },
  info: { cls: 'border-line text-fg', Icon: Info },
};

export function Alert({ tone = 'info', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-md border bg-surface p-3 text-sm ${cls}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
