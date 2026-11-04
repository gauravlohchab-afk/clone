import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AuthLayout } from '../components/AuthLayout';
import { Alert } from '../components/Alert';
import { FullPageSpinner } from '../components/Spinner';
import { api } from '../lib/api';
import { errorMessage } from '../lib/form-errors';
import { homePathFor, useAuth } from '../stores/auth';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'working' | 'done' | 'error'>(token ? 'working' : 'error');
  const [message, setMessage] = useState('This verification link is incomplete.');
  const { user, reloadMe, status } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    api.post('/api/v1/auth/verify-email', { token })
      .then(async () => {
        setState('done');
        if (useAuth.getState().status === 'signed_in') await reloadMe();
      })
      .catch((e) => { setState('error'); setMessage(errorMessage(e)); });
  }, [token, reloadMe]);

  if (state === 'working') return <FullPageSpinner label="Verifying your email" />;
  const next = status === 'signed_in' && user ? homePathFor(user) : '/login';
  return (
    <AuthLayout title={state === 'done' ? 'Email verified' : 'Verification failed'}>
      {state === 'done' ? <Alert tone="success">Thanks, your email is confirmed.</Alert> : <Alert tone="error">{message}</Alert>}
      <Link to={next} className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-on-primary">Continue</Link>
    </AuthLayout>
  );
}
