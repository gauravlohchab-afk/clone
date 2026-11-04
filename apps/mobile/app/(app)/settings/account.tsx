import { useState } from 'react';
import { Share, View } from 'react-native';
import { router } from 'expo-router';
import type { MeDto } from '@vyro/types';
import { Screen, Section } from '../../../components/Screen';
import { TextField } from '../../../components/TextField';
import { Button } from '../../../components/Button';
import { Alert } from '../../../components/Alert';
import { Text } from '../../../components/Text';
import { api } from '../../../lib/api';
import { errorMessage } from '../../../lib/errors';
import { useAuth } from '../../../stores/auth';
import { useTheme } from '../../../stores/theme';

export default function Account() {
  const { c } = useTheme();
  const { user, setUser, clear } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'deactivate' | 'delete' | null>(null);
  const [pw, setPw] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const needsCode = !user.hasPassword && user.mfaEnabled;

  return (
    <Screen edges={[]}>
      {error && <Alert tone="error">{error}</Alert>}
      {user.status === 'pending_deletion' && (
        <Alert tone="error">
          <View style={{ gap: 10 }}>
            <Text variant="label" style={{ color: c.danger }}>Your account is scheduled for permanent deletion.</Text>
            <Button title="Keep my account" variant="secondary" onPress={async () => {
              try { const me = await api.delete<MeDto>('/api/v1/me/deletion'); setUser(me); router.replace('/'); } catch (e) { setError(errorMessage(e)); }
            }} />
          </View>
        </Alert>
      )}
      <Section title="Account details">
        <Text>Email: {user.email}</Text>
        <Text>Sign-in methods: {[user.hasPassword && 'Password', user.googleLinked && 'Google'].filter(Boolean).join(', ')}</Text>
        <Text>Member since {new Date(user.createdAt).toLocaleDateString()}</Text>
      </Section>
      <Section title="Download your data" description="Your account, profile, settings and security activity as JSON.">
        <Button title="Export data" variant="secondary" onPress={async () => {
          setError(null);
          try {
            const data = await api.get<unknown>('/api/v1/me/export');
            await Share.share({ title: 'Account export', message: JSON.stringify(data, null, 2) });
          } catch (e) { setError(errorMessage(e)); }
        }} />
      </Section>
      <Section title="Deactivate or delete">
        {!confirm ? (
          <>
            <Text variant="small">Deactivating hides your profile until you log in again.</Text>
            <Button title="Deactivate account" variant="secondary" onPress={() => setConfirm('deactivate')} />
            <Text variant="small">Deleting removes your account permanently after 30 days. Log in before then to cancel.</Text>
            <Button title="Delete account" variant="danger" onPress={() => setConfirm('delete')} />
          </>
        ) : (
          <>
            <Text variant="label">{confirm === 'delete' ? 'Confirm account deletion' : 'Confirm deactivation'}</Text>
            {user.hasPassword && <TextField label="Password" password value={pw} onChangeText={setPw} />}
            {needsCode && <TextField label="Two-factor code" value={code} onChangeText={setCode} autoCapitalize="none" />}
            <Button title={confirm === 'delete' ? 'Delete in 30 days' : 'Deactivate'} variant="danger" loading={busy} onPress={async () => {
              setBusy(true); setError(null);
              try {
                await api.post(confirm === 'delete' ? '/api/v1/me/deletion' : '/api/v1/me/deactivate', { password: pw || undefined, code: code || undefined });
                await clear();
              } catch (e) { setError(errorMessage(e)); setBusy(false); }
            }} />
            <Button title="Cancel" variant="ghost" onPress={() => { setConfirm(null); setPw(''); setCode(''); }} />
          </>
        )}
      </Section>
    </Screen>
  );
}
