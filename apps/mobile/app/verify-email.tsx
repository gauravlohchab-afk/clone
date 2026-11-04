import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../components/Screen';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { api } from '../lib/api';
import { errorMessage } from '../lib/errors';
import { useAuth } from '../stores/auth';

/** Deep link target: <scheme>://verify-email?token=… (and https app links once a domain exists). */
export default function VerifyEmail() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [state, setState] = useState<'working' | 'done' | 'error'>(token ? 'working' : 'error');
  const [message, setMessage] = useState('This verification link is incomplete.');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    api.post('/api/v1/auth/verify-email', { token })
      .then(async () => {
        setState('done');
        if (useAuth.getState().status === 'signed_in') await useAuth.getState().reloadMe();
      })
      .catch((e) => { setState('error'); setMessage(errorMessage(e)); });
  }, [token]);

  if (state === 'working') return <Screen title="Verifying…"><ActivityIndicator /></Screen>;
  return (
    <Screen title={state === 'done' ? 'Email verified' : 'Verification failed'}>
      <Alert tone={state === 'done' ? 'success' : 'error'}>{state === 'done' ? 'Thanks, your email is confirmed.' : message}</Alert>
      <Button title="Continue" onPress={() => router.replace('/')} />
    </Screen>
  );
}
