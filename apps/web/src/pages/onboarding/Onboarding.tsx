import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Loader2, MailCheck, X } from 'lucide-react';
import { interestCatalog, limits } from '@vyro/config';
import { username as usernameSchema } from '@vyro/validation';
import type { MeDto, ProfileDto } from '@vyro/types';
import { Wordmark } from '../../components/Logo';
import { Button } from '../../components/Button';
import { TextArea, TextField } from '../../components/Field';
import { Alert } from '../../components/Alert';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/form-errors';
import { useAuth } from '../../stores/auth';

type Step = 'verify' | 'username' | 'about' | 'interests';
const order: Step[] = ['verify', 'username', 'about', 'interests'];

function firstStep(user: MeDto): Step {
  if (!user.emailVerified) return 'verify';
  if (!user.username) return 'username';
  return 'about';
}

export function Onboarding() {
  const user = useAuth((s) => s.user)!;
  const [step, setStep] = useState<Step>(() => firstStep(user));
  const index = order.indexOf(step);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <Wordmark />
      <div className="mt-8 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={order.length} aria-valuenow={index + 1} aria-label="Setup progress">
        {order.map((s, i) => <span key={s} className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-primary' : 'bg-raised'}`} />)}
      </div>
      <div className="flex-1 py-10">
        {step === 'verify' && <VerifyStep onDone={() => setStep('username')} />}
        {step === 'username' && <UsernameStep onDone={() => setStep('about')} />}
        {step === 'about' && <AboutStep onDone={() => setStep('interests')} />}
        {step === 'interests' && <InterestsStep />}
      </div>
    </div>
  );
}

function VerifyStep({ onDone }: { onDone: () => void }) {
  const { user, reloadMe } = useAuth();
  const [note, setNote] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section>
      <MailCheck className="size-10 text-link" aria-hidden="true" />
      <h1 className="mt-4 text-3xl font-bold">Check your inbox</h1>
      <p className="mt-2 text-muted">We sent a verification link to <strong className="text-fg">{user?.email}</strong>. Open it on this or any device.</p>
      {note && <div className="mt-6"><Alert tone={note.tone}>{note.text}</Alert></div>}
      <div className="mt-8 space-y-3">
        <Button block loading={busy} onClick={async () => {
          setBusy(true);
          const me = await reloadMe();
          setBusy(false);
          if (me?.emailVerified) onDone();
          else setNote({ tone: 'info', text: 'Not verified yet. Open the link in the email, then try again.' });
        }}>I have verified my email</Button>
        <Button variant="secondary" block onClick={async () => {
          try {
            await api.post('/api/v1/auth/resend-verification', { email: user?.email });
            setNote({ tone: 'success', text: 'A new link is on its way.' });
          } catch (e) { setNote({ tone: 'error', text: errorMessage(e) }); }
        }}>Resend email</Button>
      </div>
    </section>
  );
}

type Availability = { state: 'idle' | 'checking' | 'ok' | 'taken'; reason?: string; suggestions?: string[] };

function UsernameStep({ onDone }: { onDone: () => void }) {
  const setUser = useAuth((s) => s.setUser);
  const [value, setValue] = useState('');
  const [avail, setAvail] = useState<Availability>({ state: 'idle' });
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

  const status =
    avail.state === 'checking' ? <Loader2 className="mr-3 size-4 animate-spin text-muted" aria-label="Checking" /> :
    avail.state === 'ok' ? <Check className="mr-3 size-4 text-link" aria-label="Available" /> :
    avail.state === 'taken' ? <X className="mr-3 size-4 text-danger" aria-label="Not available" /> : null;

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setError(null);
      setSaving(true);
      try {
        setUser(await api.put<MeDto>('/api/v1/me/username', { username: value.trim().toLowerCase() }));
        onDone();
      } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
    }}>
      <h1 className="text-3xl font-bold">Pick a username</h1>
      <p className="mt-2 text-muted">This is how people find and mention you. You can change it later.</p>
      <div className="mt-8 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Username" autoCapitalize="none" autoComplete="off" spellCheck={false} maxLength={limits.username.max}
          value={value} onChange={(e) => setValue(e.target.value)} trailing={status}
          error={avail.state === 'taken' ? avail.reason : undefined}
          hint="Letters, numbers, periods and underscores." />
        {avail.suggestions && avail.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Suggestions">
            {avail.suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setValue(s)} className="min-h-9 rounded-full border border-line px-3 text-sm hover:border-fg/40">@{s}</button>
            ))}
          </div>
        )}
        <Button type="submit" block loading={saving} disabled={avail.state !== 'ok'}>Continue</Button>
      </div>
    </form>
  );
}

const aboutSchema = z.object({ displayName: z.string().trim().max(limits.displayName.max), bio: z.string().trim().max(limits.bio.max) });

function AboutStep({ onDone }: { onDone: () => void }) {
  const { user, reloadMe } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<z.infer<typeof aboutSchema>>({
    resolver: zodResolver(aboutSchema),
    defaultValues: { displayName: user?.profile?.displayName ?? '', bio: user?.profile?.bio ?? '' },
  });
  return (
    <form onSubmit={handleSubmit(async (v) => {
      setError(null);
      try {
        if (v.displayName || v.bio) await api.patch<ProfileDto>('/api/v1/me/profile', v);
        await reloadMe();
        onDone();
      } catch (e) { setError(errorMessage(e)); }
    })}>
      <h1 className="text-3xl font-bold">Introduce yourself</h1>
      <p className="mt-2 text-muted">Both are optional and appear on your profile.</p>
      <div className="mt-8 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <TextField label="Display name" autoComplete="name" maxLength={limits.displayName.max} error={errors.displayName?.message} {...register('displayName')} />
        <TextArea label="Bio" counter={limits.bio.max} maxLength={limits.bio.max} value={watch('bio')} error={errors.bio?.message} {...register('bio')} />
        <Button type="submit" block loading={isSubmitting}>Continue</Button>
      </div>
    </form>
  );
}

function InterestsStep() {
  const navigate = useNavigate();
  const setUser = useAuth((s) => s.setUser);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toggle = (i: string) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < limits.interests.max ? [...p, i] : p));

  return (
    <section>
      <h1 className="text-3xl font-bold">What are you into?</h1>
      <p className="mt-2 text-muted">Pick up to {limits.interests.max}. We use these to shape what you discover.</p>
      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Interests">
        {interestCatalog.map((i) => {
          const on = picked.includes(i);
          return (
            <button key={i} type="button" aria-pressed={on} onClick={() => toggle(i)}
              className={`min-h-10 rounded-full border px-4 text-sm font-medium capitalize transition ${on ? 'border-primary bg-primary text-on-primary' : 'border-line hover:border-fg/40'}`}>
              {i}
            </button>
          );
        })}
      </div>
      <Button className="mt-10" block loading={saving} disabled={picked.length === 0} onClick={async () => {
        setSaving(true);
        setError(null);
        try {
          await api.put('/api/v1/me/interests', { interests: picked });
          const me = await api.post<MeDto>('/api/v1/me/onboarding/complete');
          setUser(me);
          navigate(`/${me.username}`, { replace: true });
        } catch (e) { setError(errorMessage(e)); setSaving(false); }
      }}>Finish</Button>
    </section>
  );
}
