import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Check, MailCheck } from 'lucide-react-native';
import { interestCatalog, limits } from '@vyro/config';
import { username as usernameSchema } from '@vyro/validation';
import type { MeDto } from '@vyro/types';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { Text } from '../components/Text';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { useAuth } from '../stores/auth';
import { useTheme } from '../stores/theme';
import { fonts } from '../components/fonts';

type Step = 'verify' | 'username' | 'about' | 'interests';
const order: Step[] = ['verify', 'username', 'about', 'interests'];
const first = (u: MeDto): Step => (!u.emailVerified ? 'verify' : !u.username ? 'username' : 'about');

export default function Onboarding() {
  const user = useAuth((s) => s.user);
  const [step, setStep] = useState<Step>(() => (user ? first(user) : 'verify'));
  const { c } = useTheme();
  if (!user) return <Redirect href="/welcome" />;
  const index = order.indexOf(step);
  return (
    <Screen>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: order.length, now: index + 1 }} style={{ flexDirection: 'row', gap: 6 }}>
        {order.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? c.primary : c.surfaceRaised }} />)}
      </View>
      {step === 'verify' && <VerifyStep onDone={() => setStep('username')} />}
      {step === 'username' && <UsernameStep onDone={() => setStep('about')} />}
      {step === 'about' && <AboutStep onDone={() => setStep('interests')} />}
      {step === 'interests' && <InterestsStep />}
    </Screen>
  );
}

function VerifyStep({ onDone }: { onDone: () => void }) {
  const { user, reloadMe } = useAuth();
  const { c } = useTheme();
  const [note, setNote] = useState<{ tone: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <View style={{ gap: 16 }}>
      <MailCheck size={40} color={c.link} />
      <Text variant="title" accessibilityRole="header">Check your inbox</Text>
      <Text variant="muted">We sent a verification link to {user?.email}. Open it on this or any device.</Text>
      {note && <Alert tone={note.tone}>{note.text}</Alert>}
      <Button title="I have verified my email" loading={busy} onPress={async () => {
        setBusy(true);
        const me = await reloadMe();
        setBusy(false);
        if (me?.emailVerified) onDone();
        else setNote({ tone: 'info', text: 'Not verified yet. Open the link in the email, then try again.' });
      }} />
      <Button title="Resend email" variant="secondary" onPress={async () => {
        try { await api.post('/api/v1/auth/resend-verification', { email: user?.email }); setNote({ tone: 'success', text: 'A new link is on its way.' }); }
        catch (e) { setNote({ tone: 'error', text: errorMessage(e) }); }
      }} />
      <Button title="Log out" variant="ghost" onPress={() => void useAuth.getState().signOut()} />
    </View>
  );
}

function UsernameStep({ onDone }: { onDone: () => void }) {
  const setUser = useAuth((s) => s.setUser);
  const { c } = useTheme();
  const [value, setValue] = useState('');
  const [avail, setAvail] = useState<{ state: 'idle' | 'checking' | 'ok' | 'taken'; reason?: string; suggestions?: string[] }>({ state: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const v = value.trim().toLowerCase();
    if (!v) return setAvail({ state: 'idle' });
    const local = usernameSchema.safeParse(v);
    if (!local.success) return setAvail({ state: 'taken', reason: local.error.issues[0]?.message });
    setAvail({ state: 'checking' });
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ available: boolean; reason: string | null; suggestions: string[] }>(`/api/v1/auth/username-availability?username=${encodeURIComponent(v)}`);
        setAvail(r.available ? { state: 'ok' } : { state: 'taken', reason: r.reason ?? 'Not available', suggestions: r.suggestions });
      } catch { setAvail({ state: 'idle' }); }
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  return (
    <View style={{ gap: 16 }}>
      <Text variant="title" accessibilityRole="header">Pick a username</Text>
      <Text variant="muted">This is how people find and mention you. You can change it later.</Text>
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Username" autoCapitalize="none" autoCorrect={false} maxLength={limits.username.max} value={value} onChangeText={setValue}
        error={avail.state === 'taken' ? avail.reason : undefined} hint={avail.state === 'ok' ? 'Available' : avail.state === 'checking' ? 'Checking…' : 'Letters, numbers, periods and underscores.'} />
      {avail.state === 'ok' && <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Check size={16} color={c.link} /><Text variant="small">@{value.trim().toLowerCase()} is yours if you want it</Text></View>}
      {avail.state === 'taken' && !!avail.suggestions?.length && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {avail.suggestions.map((s) => (
            <Pressable key={s} accessibilityRole="button" onPress={() => setValue(s)} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: c.border, justifyContent: 'center' }}>
              <Text variant="label">@{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button title="Continue" loading={saving} disabled={avail.state !== 'ok'} onPress={async () => {
        setSaving(true); setError(null);
        try { setUser(await api.put<MeDto>('/api/v1/me/username', { username: value.trim().toLowerCase() })); onDone(); }
        catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
      }} />
    </View>
  );
}

function AboutStep({ onDone }: { onDone: () => void }) {
  const { user, reloadMe } = useAuth();
  const [displayName, setDisplayName] = useState(user?.profile?.displayName ?? '');
  const [bio, setBio] = useState(user?.profile?.bio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  return (
    <View style={{ gap: 16 }}>
      <Text variant="title" accessibilityRole="header">Introduce yourself</Text>
      <Text variant="muted">Both are optional and appear on your profile.</Text>
      {error && <Alert tone="error">{error}</Alert>}
      <TextField label="Display name" maxLength={limits.displayName.max} value={displayName} onChangeText={setDisplayName} autoComplete="name" />
      <TextField label="Bio" multiline maxLength={limits.bio.max} counter={limits.bio.max} value={bio} onChangeText={setBio} style={{ minHeight: 96, paddingTop: 12, textAlignVertical: 'top' }} />
      <Button title="Continue" loading={saving} onPress={async () => {
        setSaving(true); setError(null);
        try {
          if (displayName.trim() || bio.trim()) await api.patch('/api/v1/me/profile', { displayName, bio });
          await reloadMe();
          onDone();
        } catch (e) { setError(errorMessage(e)); } finally { setSaving(false); }
      }} />
    </View>
  );
}

function InterestsStep() {
  const setUser = useAuth((s) => s.setUser);
  const { c } = useTheme();
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toggle = (i: string) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < limits.interests.max ? [...p, i] : p));
  return (
    <View style={{ gap: 16 }}>
      <Text variant="title" accessibilityRole="header">What are you into?</Text>
      <Text variant="muted">Pick up to {limits.interests.max}. We use these to shape what you discover.</Text>
      {error && <Alert tone="error">{error}</Alert>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {interestCatalog.map((i) => {
          const on = picked.includes(i);
          return (
            <Pressable key={i} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(i)}
              style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, justifyContent: 'center', borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : 'transparent' }}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: on ? c.onPrimary : c.text, textTransform: 'capitalize' }}>{i}</Text>
            </Pressable>
          );
        })}
      </View>
      <Button title="Finish" loading={saving} disabled={picked.length === 0} onPress={async () => {
        setSaving(true); setError(null);
        try {
          await api.put('/api/v1/me/interests', { interests: picked });
          setUser(await api.post<MeDto>('/api/v1/me/onboarding/complete'));
          router.replace('/profile');
        } catch (e) { setError(errorMessage(e)); setSaving(false); }
      }} />
    </View>
  );
}
