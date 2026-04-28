import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Home, ClipboardList, Building, Map, Calendar, TrendingUp, Trophy, PlusCircle, User, LogOut, Menu, X, Zap, Globe, Star } from 'lucide-react';
import Notifications from './Notifications';

const Sidebar = ({ onClose }) => {
  const { profile, signOut } = useAuth();
  const { t, language, setLanguage, LANGUAGES } = useLanguage();
  const navigate = useNavigate();
  const [newFeedbackCount, setNewFeedbackCount] = useState(0);

  // Fetch unread feedback count for volunteers
  useEffect(() => {
    if (!profile || profile.role === 'ngo') return;
    import('../lib/supabase').then(({ supabase }) => {
      supabase
        .from('ngo_applications')
        .select('id', { count: 'exact', head: false })
        .eq('volunteer_id', profile.id)
        .not('ngo_feedback', 'is', null)
        .eq('feedback_seen', false)
        .then(({ count }) => {
          setNewFeedbackCount(count || 0);
        });
    });
  }, [profile]);

  const navItems = [
    { to: '/dashboard', icon: Home, label: t('navDashboard') },
    
    // Volunteer / Admin Only Section
    ...(profile?.role !== 'ngo' ? [
      { to: '/tasks', icon: ClipboardList, label: t('navTasks') },
      { to: '/my-feedback', icon: Star, label: 'My Feedback', badge: newFeedbackCount || null },
    ] : []),

    { to: '/map', icon: Map, label: t('navMap') },
    
    // NGO & Admin Only Section
    ...(profile?.role === 'ngo' || profile?.role === 'admin' ? [
      { to: '/ngo-dashboard', icon: Zap, label: t('manageApplicationsNav') },
      { to: '/ngo-form', icon: PlusCircle, label: t('postOpportunityNav') },
    ] : []),

    { to: '/meetups', icon: Calendar, label: t('navMeetups') },
    { to: '/impact', icon: TrendingUp, label: t('navImpact') },
    { to: '/leaderboard', icon: Trophy, label: t('navLeaderboard') },
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
          <img 
            src="/echora-logo.jpeg" 
            alt="ECHORA"
            style={{
              width: 42, height: 42,
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: 'var(--shadow-primary)', 
              flexShrink: 0,
            }}
          />
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

      {/* User card (Glassmorphism) */}
      {profile && (
        <div style={{ 
          margin: '1rem', 
          padding: '1.5rem', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '24px', 
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          flexShrink: 0 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <div className="avatar" style={{ 
                width: 48, height: 48, 
                fontSize: '1rem', 
                background: 'var(--primary-grad)',
                border: '2px solid rgba(255,255,255,0.1)'
              }}>
                {profile.name?.charAt(0) || '?'}
              </div>
              <div style={{ 
                position: 'absolute', bottom: 2, right: 2, 
                width: 12, height: 12, borderRadius: '50%', 
                background: '#4ade80', border: '2px solid #1a1f2e' 
              }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', marginBottom: '0.15rem' }}>
                {profile.name || 'Demo User'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#d8b4fe', fontWeight: 600 }}>
                <Star size={12} fill="#d8b4fe" /> {profile.points || 450} XP
              </div>
            </div>
          </div>

          {/* Level Progress */}
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.05em' }}>LEVEL PROGRESS</span>
              <span style={{ fontSize: '0.65rem', color: '#ffffff', fontWeight: 700 }}>80%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: '80%', 
                background: 'linear-gradient(90deg, #6366f1 0%, #d8b4fe 100%)', 
                borderRadius: '10px' 
              }} />
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
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 99,
                  background: '#ef4444', color: '#fff',
                  fontSize: '0.65rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px', flexShrink: 0,
                  boxShadow: '0 0 0 2px var(--bg-sidebar)',
                  animation: 'pulse 2s infinite',
                }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
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
