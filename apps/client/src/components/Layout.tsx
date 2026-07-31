import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import BottomTabBar from './BottomTabBar';
import { Avatar } from './ui';
import {
  HomeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  ShieldCheckIcon as ShieldCheckIconSolid,
} from '@heroicons/react/24/solid';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const getInitials = () => {
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return parts[0][0] + parts[parts.length - 1][0];
      }
      return parts[0].substring(0, 2);
    }
    return user?.email?.substring(0, 2) || '??';
  };

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: HomeIcon, iconActive: HomeIconSolid },
    { path: '/patients', label: t('nav.patients'), icon: UserGroupIcon, iconActive: UserGroupIconSolid },
    { path: '/encounters', label: t('nav.encounters'), icon: ClipboardDocumentListIcon, iconActive: ClipboardDocumentListIconSolid },
    { path: '/tasks', label: t('nav.tasks'), icon: CheckCircleIcon, iconActive: CheckCircleIconSolid },
    ...(user?.role === 'admin' ? [{ path: '/staff', label: t('nav.staff'), icon: ShieldCheckIcon, iconActive: ShieldCheckIconSolid }] : []),
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col lg:w-48 bg-bg-surface border-r border-border-default">
        <div className="flex flex-col flex-1">
          {/* Brand */}
          <div className="flex items-center h-16 px-4 border-b border-border-default">
            <h1 className="text-lg font-medium text-primary">PatientFlow</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = active ? item.iconActive : item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-[var(--radius-control)] text-sm font-medium transition-colors ${
                    active
                      ? 'bg-status-progress-bg text-status-progress-text'
                      : 'text-text-secondary hover:bg-bg-canvas hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border-default">
            <div className="flex items-center justify-between mb-3">
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="text-sm border border-border-default rounded-[var(--radius-control)] px-2 py-1 bg-bg-surface text-text-primary"
              >
                <option value="en">EN</option>
                <option value="fr">FR</option>
              </select>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-control)] text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-canvas transition-colors mb-2"
              title={user?.email}
            >
              <UserCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{user?.name || t('profile.title')}</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span>{t('auth.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden bg-bg-surface border-b border-border-default">
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="text-lg font-medium text-primary">PatientFlow</h1>
          <div className="flex items-center gap-3">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="text-sm border border-border-default rounded-[var(--radius-control)] px-2 py-1 bg-bg-surface text-text-primary"
            >
              <option value="en">EN</option>
              <option value="fr">FR</option>
            </select>
            <button
              onClick={() => navigate('/profile')}
              className="flex-shrink-0"
              aria-label={t('profile.title')}
            >
              <Avatar initials={getInitials()} size="sm" variant="in_progress" />
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-48">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pb-20 lg:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
