import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import QRCode from 'qrcode';
import { Laptop, Smartphone } from 'lucide-react';
import { password } from '@vyro/validation';
import type { LoginActivityDto, MfaSetupDto, Page, SessionDto } from '@vyro/types';
import { PasswordField, TextField } from '../../components/Field';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/form-errors';
import { useAuth } from '../../stores/auth';
import { SettingsSection } from './SettingsLayout';

const when = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

export function Security() {
  return (
    <div>
      <ChangePassword />
      <TwoFactor />
      <Sessions />
      <Activity />
    </div>
  );
}

function ChangePassword() {
  const user = useAuth((s) => s.user)!;
  const schema = z.object({ currentPassword: user.hasPassword ? z.string().min(1, 'Required') : z.string().optional(), newPassword: password });
  const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <SettingsSection title={user.hasPassword ? 'Change password' : 'Set a password'} description="Other devices will be signed out.">
      <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => {
        setNote(null);
        try { await api.post('/api/v1/auth/password', v); reset(); setNote({ tone: 'success', text: 'Password updated' }); }
        catch (e) { setNote({ tone: 'error', text: errorMessage(e) }); }
      })}>
        {note && <Alert tone={note.tone}>{note.text}</Alert>}
        {user.hasPassword && <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />}
        <PasswordField label="New password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
        <Button type="submit" loading={isSubmitting}>Update password</Button>
      </form>
    </SettingsSection>
  );
}

function TwoFactor() {
  const { user, reloadMe } = useAuth();
  const [setup, setSetup] = useState<(MfaSetupDto & { qr: string }) | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(null); try { await fn(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } };

  return (
    <SettingsSection title="Two-factor authentication" description="Require a code from an authenticator app when you log in.">
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        {codes && (
          <Alert tone="success">
            <p className="font-semibold">Save these recovery codes somewhere safe.</p>
            <p className="mt-1 text-xs text-muted">Each works once if you lose your device. They will not be shown again.</p>
            <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
          </Alert>
        )}
        {user?.mfaEnabled ? (
          <>
            <p className="text-sm"><span className="font-semibold text-link">On.</span> You will be asked for a code at each new login.</p>
            <TextField label="Code from your app or a recovery code" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
            {user.hasPassword && <PasswordField label="Password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={busy} disabled={code.length < 6} onClick={() => run(async () => {
                const r = await api.post<{ recoveryCodes: string[] }>('/api/v1/auth/mfa/recovery-codes', { code });
                setCodes(r.recoveryCodes); setCode('');
              })}>New recovery codes</Button>
              <Button variant="danger" loading={busy} disabled={code.length < 6} onClick={() => run(async () => {
                await api.post('/api/v1/auth/mfa/disable', { code, password: pw || undefined });
                setCode(''); setPw(''); setCodes(null); await reloadMe();
              })}>Turn off</Button>
            </div>
          </>
        ) : setup ? (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>Scan this code with an authenticator app.</li>
              <li>Enter the 6-digit code it shows.</li>
            </ol>
            <img src={setup.qr} alt="QR code for your authenticator app" width={180} height={180} className="rounded-md bg-white p-2" />
            <p className="text-xs text-muted">Can't scan? Enter this key: <code className="break-all font-mono text-fg">{setup.secret}</code></p>
            <TextField label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <Button loading={busy} disabled={code.length !== 6} onClick={() => run(async () => {
              const r = await api.post<{ recoveryCodes: string[] }>('/api/v1/auth/mfa/enable', { code });
              setCodes(r.recoveryCodes); setSetup(null); setCode(''); await reloadMe();
            })}>Turn on</Button>
          </>
        ) : (
          <Button variant="secondary" loading={busy} onClick={() => run(async () => {
            const s = await api.post<MfaSetupDto>('/api/v1/auth/mfa/setup');
            setSetup({ ...s, qr: await QRCode.toDataURL(s.otpauthUrl, { margin: 1, width: 360 }) });
          })}>Set up two-factor</Button>
        )}
      </div>
    </SettingsSection>
  );
}

function Sessions() {
  const signOutLocal = useAuth((s) => s.clear);
  const [items, setItems] = useState<SessionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.get<{ items: SessionDto[] }>('/api/v1/auth/sessions').then((r) => setItems(r.items)).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { void load(); }, [load]);

  return (
    <SettingsSection title="Where you're logged in">
      {error && <Alert tone="error">{error}</Alert>}
      {!items ? <p className="text-sm text-muted">Loading sessions…</p> : (
        <ul className="divide-y divide-line">
          {items.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              {s.platform === 'web' ? <Laptop className="size-5 text-muted" aria-hidden="true" /> : <Smartphone className="size-5 text-muted" aria-hidden="true" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.deviceName || (s.platform === 'web' ? 'Web browser' : s.platform)}{s.current && <span className="ml-2 text-xs font-semibold text-link">This device</span>}</p>
                <p className="text-xs text-muted">{s.ip || 'Unknown IP'} · Last active {when(s.lastUsedAt)}</p>
              </div>
              {!s.current && <Button variant="ghost" onClick={async () => {
                try { await api.delete(`/api/v1/auth/sessions/${s.id}`); await load(); } catch (e) { setError(errorMessage(e)); }
              }}>Log out</Button>}
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" className="mt-4" onClick={async () => {
        try { await api.post('/api/v1/auth/logout-all'); signOutLocal(); } catch (e) { setError(errorMessage(e)); }
      }}>Log out of all devices</Button>
    </SettingsSection>
  );
}

const activityLabel: Record<string, string> = {
  login: 'Logged in', login_failed: 'Failed login attempt', logout: 'Logged out', password_reset: 'Password reset',
  password_changed: 'Password changed', mfa_enabled: 'Two-factor turned on', mfa_disabled: 'Two-factor turned off',
  session_revoked: 'Session ended', refresh_reuse_detected: 'Suspicious session reuse blocked',
};

function Activity() {
  const [page, setPage] = useState<Page<LoginActivityDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async (cursor?: string) => {
    try {
      const next = await api.get<Page<LoginActivityDto>>(`/api/v1/auth/login-activity?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      setPage((prev) => (cursor && prev ? { items: [...prev.items, ...next.items], nextCursor: next.nextCursor } : next));
    } catch (e) { setError(errorMessage(e)); }
  };
  useEffect(() => { void load(); }, []);
  return (
    <SettingsSection title="Login activity" description="Recent security events on your account. Kept for 180 days.">
      {error && <Alert tone="error">{error}</Alert>}
      {page && (
        <ul className="divide-y divide-line">
          {page.items.map((e) => (
            <li key={e.id} className="py-2.5">
              <p className={`text-sm font-medium ${e.type === 'login_failed' || e.type === 'refresh_reuse_detected' ? 'text-danger' : ''}`}>{activityLabel[e.type] ?? e.type}</p>
              <p className="text-xs text-muted">{when(e.createdAt)} · {e.ip || 'Unknown IP'}</p>
            </li>
          ))}
        </ul>
      )}
      {page?.nextCursor && <Button variant="ghost" className="mt-2" onClick={() => void load(page.nextCursor!)}>Show more</Button>}
    </SettingsSection>
  );
}
