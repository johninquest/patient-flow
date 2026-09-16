import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClockIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, StatusPill, Avatar } from '../components/ui';

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return parts[0].substring(0, 2);
  }
  return email.substring(0, 2);
}

/**
 * Landing surface for accounts that have signed in but hold no role yet.
 *
 * New staff self-register with Google and arrive here until an admin grants
 * access. It shows only the caller's own identity — deliberately no app data,
 * because the account has no permissions. The API rejects every other endpoint
 * for these users (see AuthGuard), so navigating elsewhere would only surface
 * errors.
 */
export default function Pending() {
  const { t } = useTranslation();
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Access may have been granted while this page was open. Re-reading the
  // session picks up the new role; the route guard then lets them through.
  const handleCheckAgain = async () => {
    await refresh();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-canvas py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full" padding="lg">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-status-waiting-bg">
              <ClockIcon className="w-8 h-8 text-status-waiting-text" />
            </div>
            <div>
              <h2 className="text-2xl font-medium text-text-primary">
                {t('pending.title')}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                {t('pending.description')}
              </p>
            </div>
            <StatusPill
              status="waiting"
              label={t('staff.roles.pending')}
              icon={<ClockIcon className="w-4 h-4" />}
            />
          </div>

          {user && (
            <div className="border-t border-border-default pt-6">
              <p className="text-sm text-text-secondary mb-3">
                {t('pending.signedInAs')}
              </p>
              <div className="flex items-center gap-3">
                <Avatar
                  initials={getInitials(user.name, user.email)}
                  size="md"
                  variant="waiting"
                />
                <div className="min-w-0">
                  {user.name && (
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.name}
                    </p>
                  )}
                  <p className="text-sm text-text-secondary truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCheckAgain}
              className="w-full"
            >
              {t('pending.checkAgain')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="w-full"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
              {t('auth.logout')}
            </Button>
          </div>

          <p className="text-center text-sm text-text-secondary">
            {t('pending.contactAdmin')}
          </p>
        </div>
      </Card>
    </div>
  );
}
