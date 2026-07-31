import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { Card, FormInput, Button } from '../components/ui';

export default function Login() {
  const { t } = useTranslation();
  const { login, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message.includes('suspended')) {
        setError(t('auth.accountSuspended'));
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full" padding="lg">
        <div className="space-y-6">
          <div>
            <h2 className="text-center text-2xl font-medium text-text-primary">
              {t('auth.loginTitle')}
            </h2>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-[var(--radius-control)] bg-status-delayed-bg p-4">
                <p className="text-sm text-status-delayed-text">{error}</p>
              </div>
            )}
            <FormInput
              label={t('auth.email')}
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.email')}
            />
            <div className="relative">
              <FormInput
                label={t('auth.password')}
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute right-3 top-9.5 text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-(--radius-control) p-0.5"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full"
            >
              {t('auth.login')}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-bg-surface text-text-secondary">{t('auth.orDivider')}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={signInWithGoogle}
            className="w-full"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t('auth.signInWithGoogle')}
          </Button>

          <div className="text-center">
            <p className="text-sm text-text-secondary">
              {t('auth.contactAdmin')}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
