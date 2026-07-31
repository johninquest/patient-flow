import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getMyProfile } from '../lib/api/client';
import { Card, Avatar, StatusPill, LoadingSpinner } from '../components/ui';
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CalendarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  CheckCircleIcon as CheckCircleIconSolid,
  XCircleIcon as XCircleIconSolid,
} from '@heroicons/react/24/solid';

const ROLE_LABELS: Record<string, string> = {
  admin: 'staff.roles.admin',
  provider: 'staff.roles.provider',
  clinical_staff: 'staff.roles.clinical_staff',
  front_desk: 'staff.roles.front_desk',
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return parts[0].substring(0, 2);
  }
  return email.substring(0, 2);
}

function formatDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string | null, locale: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: getMyProfile,
  });

  if (isLoading) {
    return <LoadingSpinner size="lg" text={t('common.loading')} className="min-h-[60vh]" />;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-text-secondary">{t('common.error')}</p>
      </div>
    );
  }

  const initials = getInitials(profile.name, profile.email);
  const roleLabel = ROLE_LABELS[profile.role] ? t(ROLE_LABELS[profile.role]) : profile.role;
  const statusType = profile.status === 'active' ? 'ready' : 'delayed';
  const statusLabel = profile.status === 'active' ? t('staff.active') : t('staff.suspended');

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-control)] text-text-secondary hover:bg-bg-canvas hover:text-text-primary transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold text-text-primary">{t('profile.title')}</h1>
      </div>

      {/* Identity Card */}
      <Card padding="lg" className="mb-4">
        <div className="flex items-center gap-4">
          <Avatar initials={initials} size="lg" variant="in_progress" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-text-primary truncate">
              {profile.name || profile.email}
            </h2>
            <p className="text-sm text-text-secondary">
              {profile.title || t('profile.noTitle')} · {roleLabel}
            </p>
            <div className="mt-1.5">
              <StatusPill
                status={statusType}
                label={statusLabel}
                icon={
                  profile.status === 'active' ? (
                    <CheckCircleIconSolid className="w-4 h-4" />
                  ) : (
                    <XCircleIconSolid className="w-4 h-4" />
                  )
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Account Information Card */}
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">
          {t('profile.accountInfo')}
        </h3>
        <div className="space-y-4">
          <DetailRow
            icon={<EnvelopeIcon className="w-5 h-5" />}
            label={t('profile.email')}
            value={
              <span className="flex items-center gap-2">
                {profile.email}
                {profile.emailVerified && (
                  <CheckCircleIconSolid className="w-4 h-4 text-status-ready-text" />
                )}
              </span>
            }
          />
          <DetailRow
            icon={<IdentificationIcon className="w-5 h-5" />}
            label={t('profile.userId')}
            value={
              <span className="font-mono text-xs">{profile.id}</span>
            }
          />
          <DetailRow
            icon={<CalendarIcon className="w-5 h-5" />}
            label={t('profile.memberSince')}
            value={formatDate(profile.createdAt, i18n.language)}
          />
          <DetailRow
            icon={<ClockIcon className="w-5 h-5" />}
            label={t('profile.lastLogin')}
            value={formatDateTime(profile.lastLogin, i18n.language)}
          />
        </div>
      </Card>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-text-secondary flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <dt className="text-xs font-medium text-text-secondary">{label}</dt>
        <dd className="text-sm text-text-primary mt-0.5 break-all">{value}</dd>
      </div>
    </div>
  );
}
