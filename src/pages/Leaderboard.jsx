import React, { useState } from 'react';
import { mockVolunteers } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Trophy, Award, MapPin, CheckCircle, Users, Star, Heart, Hammer, BookOpen, Sun, Target, Crown, Medal, TrendingUp, Search, Filter } from 'lucide-react';

const TrophyIcons = [Crown, Medal, Award];
const PODIUM_COLORS = ['#fbbf24', '#94a3b8', '#b45309'];

const Leaderboard = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [search, setSearch] = useState('');

  const allVolunteers = [
    ...mockVolunteers,
    profile && !mockVolunteers.find(v => v.name === profile.name) ? {
      id: 999, name: profile.name, skills: profile.skills||[], state: profile.state||'',
      experience: profile.experience||'Beginner', points: profile.points||0,
      badges: profile.badges||[], tasksCompleted: profile.tasksCompleted||0,
    } : null,
  ].filter(Boolean);

  let ranked = [...allVolunteers].sort((a, b) => b.points - a.points);

  if (filter === 'state' && profile?.state) {
    ranked = ranked.filter(v => v.state === profile.state);
  }
  if (filter === 'skill' && selectedSkill) {
    ranked = ranked.filter(v => v.skills?.includes(selectedSkill));
  }
  if (search) {
    ranked = ranked.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));
  }

  const top3 = ranked.slice(0, 3);
  const remaining = ranked.slice(3);
  const userRank = ranked.findIndex(v => v.id === profile?.id || v.name === profile?.name) + 1;

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Trophy style={{ color: 'var(--gold-mid)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold-mid)', letterSpacing: '0.1em' }}>{t('hallOfFame')}</span>
        </div>
        <h1 className="page-title" style={{ fontSize: '3rem', fontWeight: 800, wordBreak: 'break-word' }}>{t('impactLeaders')}</h1>
        <p className="page-subtitle" style={{ fontSize: '1.2rem' }}>{t('mostDedicatedChangemakers')}</p>
      </div>

      {/* Top 3 Podium */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem', padding: '0 1rem', flexWrap: 'wrap' }}>
        {/* Silver - Rank 2 */}
        {top3[1] && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '200px' }}>
             <div style={{ position: 'relative' }}>
               <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, border: '4px solid rgba(148,163,184,0.3)', boxShadow: '0 0 20px rgba(148,163,184,0.2)' }}>
                 {top3[1].name.charAt(0)}
               </div>
               <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#94a3b8', color: '#0f172a', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 900, border: '2px solid #1a202c' }}>2</div>
             </div>
             <div style={{ textAlign: 'center' }}>
               <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{top3[1].name}</div>
               <div className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 900 }}>{top3[1].points} pts</div>
             </div>
             <div style={{ width: '100%', height: '100px', background: 'linear-gradient(180deg, rgba(148,163,184,0.15) 0%, transparent 100%)', borderRadius: '16px 16px 0 0', border: '1px solid rgba(148,163,184,0.1)', borderBottom: 'none' }} />
          </div>
        )}

        {/* Gold - Rank 1 */}
        {top3[0] && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '240px', transform: 'translateY(-20px)' }}>
             <Crown size={40} style={{ color: '#fbbf24', filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.5))' }} />
             <div style={{ position: 'relative' }}>
               <div style={{ width: 110, height: 110, borderRadius: '50%', background: 'var(--gold-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', fontWeight: 800, color: '#1a0e05', border: '6px solid rgba(201,168,76,0.4)', boxShadow: '0 0 40px rgba(201,168,76,0.3)' }}>
                 {top3[0].name.charAt(0)}
               </div>
               <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#fbbf24', color: '#1a0e05', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 900, border: '3px solid #1a202c' }}>1</div>
             </div>
             <div style={{ textAlign: 'center' }}>
               <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.3rem' }}>{top3[0].name}</div>
               <div className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 900, background: 'var(--gold-grad)' }}>{top3[0].points} pts</div>
             </div>
             <div style={{ width: '100%', height: '140px', background: 'linear-gradient(180deg, rgba(201,168,76,0.2) 0%, transparent 100%)', borderRadius: '24px 24px 0 0', border: '1.5px solid rgba(201,168,76,0.2)', borderBottom: 'none' }} />
          </div>
        )}

        {/* Bronze - Rank 3 */}
        {top3[2] && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '180px' }}>
             <div style={{ position: 'relative' }}>
               <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, border: '4px solid rgba(180,83,9,0.3)', boxShadow: '0 0 20px rgba(180,83,9,0.2)' }}>
                 {top3[2].name.charAt(0)}
               </div>
               <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#b45309', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, border: '2px solid #1a202c' }}>3</div>
             </div>
             <div style={{ textAlign: 'center' }}>
               <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>{top3[2].name}</div>
               <div className="gradient-text" style={{ fontSize: '1.1rem', fontWeight: 900 }}>{top3[2].points} pts</div>
             </div>
             <div style={{ width: '100%', height: '70px', background: 'linear-gradient(180deg, rgba(180,83,9,0.15) 0%, transparent 100%)', borderRadius: '12px 12px 0 0', border: '1px solid rgba(180,83,9,0.1)', borderBottom: 'none' }} />
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder={t('searchVolunteers')} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.8rem', height: '44px', borderRadius: '10px' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { label: t('globalFilter'), val: 'all' },
            { label: t('stateFilter'), val: 'state', disabled: !profile?.state },
            { label: t('skillsFilter'), val: 'skill' },
          ].map(opt => (
            <button key={opt.val}
              onClick={() => setFilter(opt.val)}
              disabled={opt.disabled}
              style={{
                height: '44px', padding: '0 1.25rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: opt.disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                background: filter === opt.val ? 'var(--gold-grad)' : 'rgba(255,255,255,0.05)',
                color: filter === opt.val ? '#1a0e05' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                opacity: opt.disabled ? 0.3 : 1
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {userRank > 0 && (
          <div style={{ marginLeft: 'auto', background: 'rgba(201,168,76,0.1)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid rgba(201,168,76,0.2)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('yourGlobalRank')}</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--gold-mid)' }}>#{userRank}</div>
          </div>
        )}
      </div>

      {/* Rankings Table Style */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {remaining.map((v, i) => {
          const actualRank = i + 4;
          return (
            <div key={v.id} className="card card-hover" style={{ 
              borderRadius: '20px', padding: '1rem 1.5rem', border: '1px solid var(--border-color)',
              background: v.id === profile?.id ? 'rgba(201,168,76,0.05)' : 'var(--bg-card)',
              transition: 'transform 0.2s, background 0.2s'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ width: 40, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>#{actualRank}</div>
                
                <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'var(--primary-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
                  {v.name.charAt(0)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{v.name}</span>
                    {v.id === profile?.id && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>YOU</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> {v.state || 'India'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle size={12} /> {v.tasksCompleted || 0} {t('tasksDoneLabel')}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '300px' }}>
                   {v.badges?.slice(0, 2).map(b => (
                     <div key={b} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                       {b}
                     </div>
                   ))}
                </div>

                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                  <div className="gradient-text" style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)' }}>{v.points}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{t('impactPoints')}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {ranked.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <Search size={48} style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('noChangemakersFound')}</h3>
          <p style={{ color: 'var(--text-muted)' }}>{t('tryAdjustingFilters')}</p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
