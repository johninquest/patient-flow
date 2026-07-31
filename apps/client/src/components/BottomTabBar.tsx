import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
} from '@heroicons/react/24/solid';

export default function BottomTabBar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const tabs = [
    {
      path: '/dashboard',
      label: t('nav.dashboard'),
      icon: HomeIcon,
      iconActive: HomeIconSolid,
    },
    {
      path: '/patients',
      label: t('nav.patients'),
      icon: UserGroupIcon,
      iconActive: UserGroupIconSolid,
    },
    {
      path: '/encounters',
      label: t('nav.encounters'),
      icon: ClipboardDocumentListIcon,
      iconActive: ClipboardDocumentListIconSolid,
    },
    {
      path: '/tasks',
      label: t('nav.tasks'),
      icon: CheckCircleIcon,
      iconActive: CheckCircleIconSolid,
    },
  ];

  // Add Staff tab for admin users
  if (user?.role === 'admin') {
    tabs.push({
      path: '/staff',
      label: t('nav.staff'),
      icon: ShieldCheckIcon,
      iconActive: ShieldCheckIconSolid,
    });
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-bg-surface border-t border-border-default z-40">
      <div className="flex justify-around items-center h-16 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = active ? tab.iconActive : tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-status-progress-text'
                  : 'text-text-secondary'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
