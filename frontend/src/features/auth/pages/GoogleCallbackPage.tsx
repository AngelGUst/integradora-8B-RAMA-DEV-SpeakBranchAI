import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../hooks/useAuth';
import Logo from '@/shared/components/ui/Logo';

export default function GoogleCallbackPage() {
    const [searchParams] = useSearchParams();
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const code = searchParams.get('code');
        const oauthError = searchParams.get('error');
        const oauthErrorDescription = searchParams.get('error_description');

        if (oauthError) {
            setError(oauthErrorDescription ?? 'Google sign-in was cancelled.');
            setIsLoading(false);
            return;
        }

        if (!code) {
            setError('No authorization code provided.');
            setIsLoading(false);
            return;
        }

        const finish = async () => {
            try {
                const res = await authApi.googleCallback(code);
                login(res.access, res.refresh, res.user);
                const nextRoute = res.user.role === 'ADMIN' ? '/admin/questions' : '/dashboard';
                navigate(nextRoute, { replace: true });
            } catch {
                setError('Google sign-in failed. Please try again.');
                setIsLoading(false);
            }
        };

        void finish();
    }, [login, navigate, searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#06060A] text-white">
            <div className="flex flex-col items-center gap-4">
                <Logo size="sm" />
                {isLoading && !error ? (
                    <p className="text-sm text-slate-400">Completing Google sign-in…</p>
                ) : (
                    <p className="text-sm text-red-400">{error}</p>
                )}
            </div>
        </div>
    );
}
