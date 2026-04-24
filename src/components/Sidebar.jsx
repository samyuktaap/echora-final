import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Home, ClipboardList, Building, Map, Calendar, TrendingUp, Trophy, PlusCircle, User, LogOut, Menu, X, Zap, Globe } from 'lucide-react';

const Sidebar = ({ onClose }) => {
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage, LANGUAGES } = useLanguage();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', icon: Home, label: t('navDashboard') },
    { to: '/tasks', icon: ClipboardList, label: t('navTasks') },
    ...(profile?.role === 'ngo' || profile?.role === 'admin' ? [
      { to: '/ngo-dashboard', icon: Building, label: 'Volunteer Apps' }
    ] : []),
    { to: '/ngo-requests', icon: Building, label: t('navNGORequests') },
    { to: '/map', icon: Map, label: t('navMap') },
    { to: '/meetups', icon: Calendar, label: t('navMeetups') },
    { to: '/impact', icon: TrendingUp, label: t('navImpact') },
    { to: '/leaderboard', icon: Trophy, label: t('navLeaderboard') },
    { to: '/ngo-form', icon: PlusCircle, label: t('navNGOForm') },
    { to: '/profile', icon: User, label: t('navProfile') },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)', height: '100vh',
      background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', position: 'fixed',
      left: 0, top: 0, bottom: 0, zIndex: 300, overflowY: 'auto',
    }}>
      {/* Gold accent top bar */}
      <div style={{ height: 2, background: 'var(--gold-grad)', flexShrink: 0 }} />

      {/* Logo */}
      <div style={{ padding: '2rem 1.5rem 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 42, height: 42, borderRadius: '12px',
            background: 'var(--primary-grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-primary)', flexShrink: 0,
            color: 'white',
          }}>
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary-light)', letterSpacing: '-0.01em' }}>ECHORA</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t('appTagline')}</div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* User card */}
      {profile && (
        <div style={{ padding: '1.5rem 1.5rem', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="avatar" style={{ width: 42, height: 42, fontSize: '0.9rem' }}>
              {profile.name?.charAt(0) || '?'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.name || 'Volunteer'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--primary-mid)' }}>{profile.points || 0} {t('pts')}</span>
                {' · '}{profile.experience || 'Beginner'}
              </div>
            </div>
          </div>
          {/* Points progress */}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {profile.points < 200 ? t('toSilver') : profile.points < 500 ? t('toGold') : t('toPlatinum')}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-mid)' }}>
                {profile.points < 200 ? `${200 - profile.points} ${t('left')}` : profile.points < 500 ? `${500 - profile.points} ${t('left')}` : `${1000 - profile.points} ${t('left')}`}
              </span>
            </div>
            <div className="progress-bar" style={{ height: 6 }}>
              <div className="progress-fill" style={{ width: `${Math.min(((profile.points || 0) / (profile.points < 200 ? 200 : profile.points < 500 ? 500 : 1000)) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', padding: '0 0.5rem', marginBottom: '1rem' }}>
          {t('navNavigation')}
        </div>
        {/* Language Switcher Mini */}
        <div style={{ padding: '0 0.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '6px',
                  border: '1.5px solid',
                  borderColor: language === lang.code ? 'var(--primary-mid)' : 'var(--border-color)',
                  background: language === lang.code ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: language === lang.code ? 'var(--primary-light)' : 'var(--text-muted)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title={lang.name}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {navItems.map(item => {
          const IconComponent = item.icon;
          return (
            <NavLink key={item.to} to={item.to} onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 0.75rem', borderRadius: '12px',
                fontSize: '0.9rem', fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--primary-light)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.2s ease',
                borderLeft: isActive ? '3px solid var(--primary-mid)' : '3px solid transparent',
              })}
            >
              <IconComponent size={18} strokeWidth={2} style={{ flexShrink: 0, opacity: 0.8 }} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', flexShrink: 0 }}>
        <button onClick={handleSignOut} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem 0.85rem', borderRadius: '12px', fontSize: '0.9rem',
          fontWeight: 500, color: 'var(--danger-light)', background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', transition: 'all 0.2s',
        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
          <LogOut size={18} strokeWidth={2} /> {t('navSignOut')}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
