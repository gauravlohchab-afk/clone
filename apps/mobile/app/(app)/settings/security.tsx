import { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Laptop, Smartphone } from 'lucide-react-native';
import type { LoginActivityDto, MfaSetupDto, Page, SessionDto } from '@vyro/types';
import { password as passwordSchema } from '@vyro/validation';
import { Screen, Section } from '../../../components/Screen';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { Alert } from '../../../components/Alert';
import { Text } from '../../../components/Text';
import { api } from '../../../lib/api';
import { errorMessage } from '../../../lib/errors';
import { useAuth } from '../../../stores/auth';
import { useTheme } from '../../../stores/theme';

const when = (iso: string) => new Date(iso).toLocaleString();

export default function Security() {
  return (
    <Screen edges={[]}>
      <ChangePassword />
      <TwoFactor />
      <Sessions />
      <Activity />
    </Screen>
  );
}

function ChangePassword() {
  const user = useAuth((s) => s.user)!;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [note, setNote] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Section title={user.hasPassword ? 'Change password' : 'Set a password'} description="Other devices will be signed out.">
      {note && <Alert tone={note.tone}>{note.text}</Alert>}
      {user.hasPassword && <TextField label="Current password" password value={current} onChangeText={setCurrent} textContentType="password" />}
      <TextField label="New password" password value={next} onChangeText={setNext} textContentType="newPassword" error={fieldError} />
      <Button title="Update password" loading={busy} onPress={async () => {
        const parsed = passwordSchema.safeParse(next);
        setFieldError(parsed.success ? undefined : parsed.error.issues[0]?.message);
        if (!parsed.success) return;
        setBusy(true); setNote(null);
        try {
          await api.post('/api/v1/auth/password', { currentPassword: current || undefined, newPassword: next });
          setCurrent(''); setNext('');
          setNote({ tone: 'success', text: 'Password updated' });
        } catch (e) { setNote({ tone: 'error', text: errorMessage(e) }); } finally { setBusy(false); }
      }} />
    </Section>
  );
}

function TwoFactor() {
  const { user, reloadMe } = useAuth();
  const [setup, setSetup] = useState<MfaSetupDto | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); setError(null); try { await fn(); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); } };

  return (
    <Section title="Two-factor authentication" description="Require a code from an authenticator app when you log in.">
      {error && <Alert tone="error">{error}</Alert>}
      {codes && (
        <Alert tone="success">
          <View style={{ gap: 8 }}>
            <Text variant="label">Save these recovery codes somewhere safe. They will not be shown again.</Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 14 }} selectable>{codes.join('\n')}</Text>
            <Button title="Copy codes" variant="secondary" onPress={() => void Clipboard.setStringAsync(codes.join('\n'))} />
          </View>
        </Alert>
      )}
      {user?.mfaEnabled ? (
        <>
          <Text>Two-factor is on.</Text>
          <TextField label="Code from your app or a recovery code" autoCapitalize="none" value={code} onChangeText={setCode} textContentType="oneTimeCode" />
          {user.hasPassword && <TextField label="Password" password value={pw} onChangeText={setPw} />}
          <Button title="New recovery codes" variant="secondary" loading={busy} disabled={code.length < 6} onPress={() => run(async () => {
            const r = await api.post<{ recoveryCodes: string[] }>('/api/v1/auth/mfa/recovery-codes', { code });
            setCodes(r.recoveryCodes); setCode('');
          })} />
          <Button title="Turn off" variant="danger" loading={busy} disabled={code.length < 6} onPress={() => run(async () => {
            await api.post('/api/v1/auth/mfa/disable', { code, password: pw || undefined });
            setCode(''); setPw(''); setCodes(null); await reloadMe();
          })} />
        </>
      ) : setup ? (
        <>
          <Text variant="muted">Add this account to your authenticator app, then enter the 6-digit code it shows.</Text>
          <Button title="Open authenticator app" variant="secondary" onPress={() => void Linking.openURL(setup.otpauthUrl).catch(() => setError('No authenticator app found. Copy the key instead.'))} />
          <Text variant="small" selectable>Setup key: {setup.secret}</Text>
          <Button title="Copy setup key" variant="ghost" onPress={() => void Clipboard.setStringAsync(setup.secret)} />
          <TextField label="6-digit code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} textContentType="oneTimeCode" />
          <Button title="Turn on" loading={busy} disabled={code.length !== 6} onPress={() => run(async () => {
            const r = await api.post<{ recoveryCodes: string[] }>('/api/v1/auth/mfa/enable', { code });
            setCodes(r.recoveryCodes); setSetup(null); setCode(''); await reloadMe();
          })} />
        </>
      ) : (
        <Button title="Set up two-factor" variant="secondary" loading={busy} onPress={() => run(async () => setSetup(await api.post<MfaSetupDto>('/api/v1/auth/mfa/setup')))} />
      )}
    </Section>
  );
}

function Sessions() {
  const { c } = useTheme();
  const clear = useAuth((s) => s.clear);
  const [items, setItems] = useState<SessionDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api.get<{ items: SessionDto[] }>('/api/v1/auth/sessions').then((r) => setItems(r.items)).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { void load(); }, [load]);
  return (
    <Section title="Where you're logged in">
      {error && <Alert tone="error">{error}</Alert>}
      {!items ? <Text variant="muted">Loading sessions…</Text> : items.map((s) => (
        <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {s.platform === 'web' ? <Laptop size={20} color={c.textMuted} /> : <Smartphone size={20} color={c.textMuted} />}
          <View style={{ flex: 1 }}>
            <Text variant="label">{s.deviceName || (s.platform === 'web' ? 'Web browser' : s.platform)}{s.current ? '  · This device' : ''}</Text>
            <Text variant="small">{s.ip || 'Unknown IP'} · {when(s.lastUsedAt)}</Text>
          </View>
          {!s.current && <Button title="Log out" variant="ghost" onPress={async () => {
            try { await api.delete(`/api/v1/auth/sessions/${s.id}`); await load(); } catch (e) { setError(errorMessage(e)); }
          }} />}
        </View>
      ))}
      <Button title="Log out of all devices" variant="secondary" onPress={async () => {
        try { await api.post('/api/v1/auth/logout-all'); await clear(); } catch (e) { setError(errorMessage(e)); }
      }} />
    </Section>
  );
}

const labels: Record<string, string> = {
  login: 'Logged in', login_failed: 'Failed login attempt', logout: 'Logged out', password_reset: 'Password reset',
  password_changed: 'Password changed', mfa_enabled: 'Two-factor turned on', mfa_disabled: 'Two-factor turned off',
  session_revoked: 'Session ended', refresh_reuse_detected: 'Suspicious session reuse blocked',
};

function Activity() {
  const { c } = useTheme();
  const [page, setPage] = useState<Page<LoginActivityDto> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (cursor?: string) => {
    try {
      const next = await api.get<Page<LoginActivityDto>>(`/api/v1/auth/login-activity?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      setPage((prev) => (cursor && prev ? { items: [...prev.items, ...next.items], nextCursor: next.nextCursor } : next));
    } catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <Section title="Login activity" description="Kept for 180 days.">
      {error && <Alert tone="error">{error}</Alert>}
      {page?.items.map((e) => (
        <View key={e.id}>
          <Text variant="label" style={e.type === 'login_failed' || e.type === 'refresh_reuse_detected' ? { color: c.danger } : undefined}>{labels[e.type] ?? e.type}</Text>
          <Text variant="small">{when(e.createdAt)} · {e.ip || 'Unknown IP'}</Text>
        </View>
      ))}
      {page?.nextCursor && <Button title="Show more" variant="ghost" onPress={() => void load(page.nextCursor!)} />}
    </Section>
  );
}
