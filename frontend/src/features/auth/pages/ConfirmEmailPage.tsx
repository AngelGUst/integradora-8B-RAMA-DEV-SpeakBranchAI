import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Logo from '@/shared/components/ui/Logo';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

type Status = 'loading' | 'success' | 'error';

export default function ConfirmEmailPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid confirmation link.');
      return;
    }

    fetch(`${API_BASE}/auth/confirm-email/${token}/`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message ?? 'Email confirmed! You can now log in.');
        } else {
          setStatus('error');
          setMessage(data.error ?? 'The link is invalid or has expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not reach the server. Please try again.');
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06060A] px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
        <Logo size="sm" />

        {status === 'loading' && (
          <>
            <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
            <p className="text-sm text-white/40">Confirming your account…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
              <h1 className="text-xl font-black tracking-tight text-white/90">
                Account confirmed
              </h1>
              <p className="text-sm text-white/40 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Go to login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex flex-col items-center gap-3">
              <XCircle className="h-12 w-12 text-red-400" />
              <h1 className="text-xl font-black tracking-tight text-white/90">
                Confirmation failed
              </h1>
              <p className="text-sm text-white/40 leading-relaxed">{message}</p>
            </div>
            <Link
              to="/register"
              className="w-full py-2.5 text-center border border-white/[0.08] hover:bg-white/[0.04] text-white/60 hover:text-white/80 text-sm font-semibold rounded-xl transition-colors"
            >
              Register again
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
