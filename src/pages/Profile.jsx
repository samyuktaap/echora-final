import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { SKILLS_LIST, LANGUAGES_LIST, INDIA_STATES } from '../data/mockData';

const StarRating = ({ value, onChange }) => (
  <div className="stars" style={{ cursor: onChange ? 'pointer' : 'default' }}>
    {[1,2,3,4,5].map(s => (
      <span key={s} onClick={() => onChange && onChange(s)}
        style={{ fontSize: '1.2rem', color: s <= value ? 'var(--gold-mid)' : 'var(--border-color)', transition: 'color 0.15s' }}>★</span>
    ))}
  </div>
);

const Profile = () => {
  const { profile, user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ngoFeedbacks, setNgoFeedbacks] = useState([]);

  // Load notes and feedback from Supabase
  useEffect(() => {
    if (!user) return;
    
    // Fetch NGO Feedback (using ngo_name stored in table to avoid RLS issues)
    console.log('Fetching feedback for user:', user.id);
    
    supabase
      .from('ngo_applications')
      .select('id, task_title, ngo_feedback, ngo_rating, created_at, ngo_name, status')
      .eq('volunteer_id', user.id)
      .not('ngo_feedback', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        console.log('Feedback query result:', { data, error, count: data?.length });
        if (error) {
          console.error('NGO Feedback fetch error:', error);
          setNgoFeedbacks([]);
        } else {
          setNgoFeedbacks(data || []);
        }
      });
  }, [user]);

  const [form, setForm] = useState({
    name: profile?.name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    state: profile?.state || '',
    experience: profile?.experience || 'Beginner',
    skills: profile?.skills || [],
    languages: profile?.languages || [],
  });

  const toggleSkill = (s) => setForm(p => ({ ...p, skills: p.skills.includes(s) ? p.skills.filter(x => x !== s) : [...p.skills, s] }));
  const toggleLang = (l) => setForm(p => ({ ...p, languages: p.languages.includes(l) ? p.languages.filter(x => x !== l) : [...p.languages, l] }));

  const handleSave = async () => {
    if (!form.name) { toast.error(t('fieldRequired')); return; }
    setSaving(true);
    updateProfile(form);
    setSaving(false);
    setEditing(false);
    toast.success(t('profileUpdated'));
  };

  const BADGE_ICONS = { 'Newcomer': '🌱', 'Helper': '🤝', 'Early Bird': '🌅', 'Star Volunteer': '⭐', 'Mentor': '🎓', 'Life Saver': '❤️', 'Builder': '🏗️', 'Educator': '📚' };
  const points = profile?.points || 0;
  const nextTier = points < 200 ? { name: 'Silver', needed: 200 } : points < 500 ? { name: 'Gold', needed: 500 } : { name: 'Platinum', needed: 1000 };
  const progress = Math.min((points / nextTier.needed) * 100, 100);

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      <div className="page-header">
        <h1 className="page-title">{t('myProfileTitle')}</h1>
        <p className="page-subtitle">{t('manageVolunteerIdentity')}</p>
      </div>

      {/* Profile Header Card */}
      <div className="card card-gold mb-3">
        <div className="card-body">
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar + Points */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div className="avatar avatar-xl" style={{ margin: '0 auto 1rem' }}>
                {profile?.name?.charAt(0) || '?'}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }} className="gradient-text">{points}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('points')}</div>
              <div style={{ marginTop: '0.75rem', width: 80 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>→ {nextTier.name}</span>
                </div>
                <div className="progress-bar" style={{ height: 4 }}>
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 260 }}>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">{t('nameLabel')}</label>
                      <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('stateLabel')}</label>
                        <select className="form-select" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}>
                          <option value="">{t('selectState')}</option>
                        {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('cityLocationLabel')} <span style={{ color: 'var(--gold-mid)', fontSize: '0.65rem' }}>{t('updatesMapAuto')}</span></label>
                    <input className="form-input" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Mumbai, Bangalore, Kochi…" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('bioLabel')}</label>
                    <textarea className="form-textarea" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder={t('bioPlaceholder')} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('experienceLevelLabel')}</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[t('beginner'), t('intermediate'), t('expert')].map(lvl => (
                        <button key={lvl} type="button" onClick={() => setForm(p => ({ ...p, experience: lvl }))} style={{
                          flex: 1, padding: '0.5rem', borderRadius: '10px', border: '1.5px solid',
                          borderColor: form.experience === lvl ? 'var(--gold-mid)' : 'var(--border-color)',
                          background: form.experience === lvl ? 'rgba(201,168,76,0.1)' : 'var(--bg-input)',
                          color: form.experience === lvl ? 'var(--gold-light)' : 'var(--text-secondary)',
                          cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s',
                        }}>{lvl}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('skillsLabel')}</label>
                    <div className="chip-group">
                      {SKILLS_LIST.map(s => <div key={s} className={`chip ${form.skills.includes(s) ? 'selected' : ''}`} onClick={() => toggleSkill(s)}>{s}</div>)}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('languagesLabel')}</label>
                    <div className="chip-group">
                      {LANGUAGES_LIST.map(l => <div key={l} className={`chip ${form.languages.includes(l) ? 'selected' : ''}`} onClick={() => toggleLang(l)}>{l}</div>)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                      {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> {t('savingText')}</> : t('saveChangesBtn')}
                    </button>
                    <button onClick={() => { setEditing(false); setForm({ name: profile?.name||'', bio: profile?.bio||'', location: profile?.location||'', state: profile?.state||'', experience: profile?.experience||'Beginner', skills: profile?.skills||[], languages: profile?.languages||[] }); }} className="btn btn-secondary">{t('cancel')}</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{profile?.name}</h2>
                    <span className="badge badge-gold">{profile?.experience ? t(profile?.experience.toLowerCase()) : t('beginner')}</span>
                    {profile?.role === 'ngo' && <span className="badge badge-primary">NGO Rep</span>}
                    <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>{t('editProfileBtn')}</button>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.7 }}>{profile?.bio || t('noBioAdded')}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {profile?.location && <span className="badge badge-gray">📍 {profile.location}{profile.state ? `, ${profile.state}` : ''}</span>}
                    {profile?.email && <span className="badge badge-gray">✉️ {profile.email}</span>}
                    <span className="badge badge-success">✅ {profile?.tasksCompleted || 0} {t('tasksDone')}</span>
                  </div>
                  {profile?.skills?.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{t('skillsLabel')}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {profile.skills.map(s => <span key={s} className="badge badge-primary">{t(s)}</span>)}
                      </div>
                    </div>
                  )}
                  {profile?.languages?.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{t('languagesLabel')}</div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {profile.languages.map(l => <span key={l} className="badge badge-gray">🌐 {t(l)}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>{t('badgesAchievements')}</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {(profile?.badges?.length > 0 ? profile.badges : ['Newcomer']).map(badge => (
              <div key={badge} style={{ textAlign: 'center', padding: '1.25rem 1rem', background: 'rgba(201,168,76,0.07)', borderRadius: '14px', border: '1px solid rgba(201,168,76,0.2)', minWidth: 90 }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>{BADGE_ICONS[badge] || '🏅'}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--gold-mid)' }}>{t(badge)}</div>
              </div>
            ))}
            {['Gold Star', 'Century Club', 'State Hero', 'Legend'].map(badge => (
              <div key={badge} style={{ textAlign: 'center', padding: '1.25rem 1rem', background: 'var(--bg-input)', borderRadius: '14px', border: '1px dashed var(--border-color)', minWidth: 90, opacity: 0.45 }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.4rem', filter: 'grayscale(1)' }}>🔒</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t(badge)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1.05rem', fontFamily: 'var(--font-display)' }}>{t('taskNotesFeedback')}</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {ngoFeedbacks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <p>No feedback received yet. NGOs will leave feedback here after you complete tasks!</p>
            </div>
          ) : (
            <>
              {/* NGO Feedbacks */}
              {ngoFeedbacks.map(fb => (
                <div key={`fb-${fb.id}`} style={{ padding: '1.25rem', background: 'rgba(201,168,76,0.06)', borderRadius: '12px', border: '1px solid rgba(201,168,76,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--gold-mid)' }}>Feedback from {fb.ngo_name?.trim() || 'NGO'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>for <span style={{ color: 'var(--text-primary)' }}>{fb.task_title || 'a task'}</span></div>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(fb.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6, fontStyle: 'italic' }}>"{fb.ngo_feedback}"</p>
                  <StarRating value={fb.ngo_rating || 5} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
