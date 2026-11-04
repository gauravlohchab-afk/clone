import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { MeDto } from '@vyro/types';
import { Button } from '../../components/Button';
import { Alert } from '../../components/Alert';
import { PasswordField, TextField } from '../../components/Field';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/form-errors';
import { useAuth } from '../../stores/auth';
import { SettingsSection } from './SettingsLayout';

export function Account() {
  const { user, clear, setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null);
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const needsCode = !user!.hasPassword && user!.mfaEnabled;

  async function exportData() {
    setError(null);
    try {
      const data = await api.get<unknown>('/api/v1/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `account-export-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setError(errorMessage(e)); }
  }

  async function act() {
    setBusy(true);
    setError(null);
    try {
      await api.post(confirm === 'delete' ? '/api/v1/me/deletion' : '/api/v1/me/deactivate', { password: pw || undefined, code: code || undefined });
      clear();
      navigate('/', { replace: true });
    } catch (e) { setError(errorMessage(e)); setBusy(false); }
  }

  return (
    <div>
      {error && <div className="mb-4"><Alert tone="error">{error}</Alert></div>}
      {user!.status === 'pending_deletion' && (
        <div className="mb-6">
          <Alert tone="error">
            Your account is scheduled for permanent deletion.
            <Button variant="secondary" className="mt-3" onClick={async () => {
              try { setUser(await api.delete<MeDto>('/api/v1/me/deletion')); } catch (e) { setError(errorMessage(e)); }
            }}>Keep my account</Button>
          </Alert>
        </div>
      )}
      <SettingsSection title="Account details">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd className="truncate">{user!.email}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Sign-in methods</dt><dd>{[user!.hasPassword && 'Password', user!.googleLinked && 'Google'].filter(Boolean).join(', ')}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Member since</dt><dd>{new Date(user!.createdAt).toLocaleDateString()}</dd></div>
        </dl>
      </SettingsSection>
      <SettingsSection title="Download your data" description="A copy of your account, profile, settings and security activity as JSON.">
        <Button variant="secondary" onClick={exportData}>Download data</Button>
      </SettingsSection>
      <SettingsSection title="Deactivate or delete">
        {!confirm ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm">Deactivating hides your profile until you log in again.</p>
              <Button variant="secondary" className="mt-2" onClick={() => setConfirm('deactivate')}>Deactivate account</Button>
            </div>
            <div>
              <p className="text-sm">Deleting removes your account permanently after 30 days. Log in before then to cancel.</p>
              <Button variant="danger" className="mt-2" onClick={() => setConfirm('delete')}>Delete account</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-md border border-danger/50 p-4">
            <p className="text-sm font-semibold">{confirm === 'delete' ? 'Confirm account deletion' : 'Confirm deactivation'}</p>
            {user!.hasPassword && <PasswordField label="Password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />}
            {needsCode && <TextField label="Two-factor code" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />}
            <div className="flex gap-2">
              <Button variant="danger" loading={busy} onClick={act}>{confirm === 'delete' ? 'Delete in 30 days' : 'Deactivate'}</Button>
              <Button variant="ghost" onClick={() => { setConfirm(null); setPw(''); setCode(''); }}>Cancel</Button>
            </div>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
