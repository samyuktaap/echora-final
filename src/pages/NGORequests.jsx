import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Smart match score ──────────────────────────────────────────────────────
function calcMatch(task, profile) {
  if (!profile) return 0;
  let score = 0;

  // Skills overlap — 50pts
  const mySkills = (profile.skills || []).map(s => s.toLowerCase());
  const needed = (task.required_skills || []).map(s => s.toLowerCase());
  if (needed.length > 0) {
    const matched = needed.filter(s => mySkills.includes(s)).length;
    score += Math.round((matched / needed.length) * 50);
  } else {
    score += 25; // no skills required = anyone qualifies
  }

  // Location — 30pts
  const myCity = (profile.location || '').toLowerCase();
  const taskCity = (task.location || '').toLowerCase();
  if (myCity && taskCity && myCity === taskCity) score += 30;
  else if (myCity && taskCity && (myCity.includes(taskCity) || taskCity.includes(myCity))) score += 15;

  // Experience — 10pts
  const expRank = { Beginner: 0, Intermediate: 1, Expert: 2 };
  const myExp = expRank[profile.experience] ?? 0;
  const needed_exp = expRank[task.min_experience] ?? 0;
  if (myExp >= needed_exp) score += 10;

  // Availability — 10pts (we don't store availability in profile currently, give partial)
  score += 5;

  return Math.min(score, 100);
}

// ── Apply Modal ────────────────────────────────────────────────────────────
function ApplyModal({ task, matchScore, matchedSkills, profile, onClose, onDone }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const missingSkills = (task.required_skills || []).filter(
    s => !(profile?.skills || []).map(x => x.toLowerCase()).includes(s.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!user) { toast.error('Not logged in'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('ngo_applications').insert({
        volunteer_id: user.id,
        ngo_id: task.ngo_id,
        task_id: String(task.id),
        task_title: task.title,
        volunteer_name: profile?.name || '',
        volunteer_email: user.email || '',
        phone: profile?.phone || '',
        address: profile?.location || '',
        dob: profile?.dob || '',
        id_proof_type: profile?.id_proof_type || '',
        id_proof_number: profile?.id_proof_number || '',
        message,
        match_score: matchScore,
        status: 'pending',
      });

      if (error) throw error;
      toast.success('Application submitted! The NGO will review it.');
      onDone();
    } catch (err) {
      toast.error('Failed to apply: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = matchScore >= 75 ? '#22c55e' : matchScore >= 45 ? '#f59e0b' : '#94a3b8';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20, padding: '2rem',
        width: '100%', maxWidth: 520, border: '1px solid var(--border-color)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{task.title}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>{task.ngo_name} · {task.location}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Match summary */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
          borderRadius: 12, padding: '1rem', marginBottom: '1.25rem',
          display: 'flex', gap: '1rem', alignItems: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: `conic-gradient(${scoreColor} ${matchScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 800, color: scoreColor,
            }}>{matchScore}%</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {matchScore >= 75 ? '🎯 Great fit!' : matchScore >= 45 ? '👍 Good fit' : '📋 Partial match'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
              {matchedSkills.length > 0
                ? `You match ${matchedSkills.length}/${task.required_skills.length} required skills`
                : 'No skill overlap — you can still apply!'}
            </div>
          </div>
        </div>

        {/* Skills breakdown */}
        {task.required_skills?.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Required Skills</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {task.required_skills.map(s => {
                const has = (profile?.skills || []).map(x => x.toLowerCase()).includes(s.toLowerCase());
                return (
                  <span key={s} style={{
                    padding: '3px 10px', borderRadius: 16, fontSize: 12, fontWeight: 700,
                    background: has ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                    color: has ? '#4ade80' : 'var(--text-muted)',
                    border: `1px solid ${has ? 'rgba(34,197,94,0.3)' : 'var(--border-color)'}`,
                  }}>
                    {has ? '✓ ' : ''}{s}
                  </span>
                );
              })}
            </div>
            {missingSkills.length > 0 && (
              <p style={{ color: '#f59e0b', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                ⚠ Missing: {missingSkills.join(', ')} — you can still apply!
              </p>
            )}
          </div>
        )}

        {/* Message */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
            Why do you want to volunteer here? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Tell the NGO about yourself and your motivation..."
            rows={4}
            className="form-textarea"
            style={{ resize: 'vertical' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
        >
          {submitting
            ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Submitting...</>
            : 'Submit Application →'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
const NGORequests = () => {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState(new Set()); // task ids volunteer already applied to
  const [selectedTask, setSelectedTask] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCause, setFilterCause] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterUrgency, setFilterUrgency] = useState('');
  const [sortBy, setSortBy] = useState('match'); // match | urgency | newest
  const [onlyMySkills, setOnlyMySkills] = useState(false);

  useEffect(() => {
    fetchTasks();
    if (user) fetchMyApplications();
  }, [user]);

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('ngo_tasks')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyApplications() {
    try {
      const { data } = await supabase
        .from('ngo_applications')
        .select('task_id')
        .eq('volunteer_id', user.id);

      if (data) setAppliedIds(new Set(data.map(a => a.task_id)));
    } catch {}
  }

  // Compute match + apply filters
  const scoredTasks = useMemo(() => {
    return tasks
      .map(t => ({ ...t, matchScore: calcMatch(t, profile), matchedSkills: (t.required_skills || []).filter(s => (profile?.skills || []).map(x => x.toLowerCase()).includes(s.toLowerCase())) }))
      .filter(t => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.ngo_name.toLowerCase().includes(search.toLowerCase()) && !t.cause.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCause && t.cause !== filterCause) return false;
        if (filterLocation && t.location.toLowerCase() !== filterLocation.toLowerCase()) return false;
        if (filterUrgency && t.urgency !== filterUrgency) return false;
        if (onlyMySkills && t.matchedSkills.length === 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match') return b.matchScore - a.matchScore;
        if (sortBy === 'urgency') {
          const u = { high: 3, medium: 2, low: 1 };
          return u[b.urgency] - u[a.urgency];
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [tasks, profile, search, filterCause, filterLocation, filterUrgency, onlyMySkills, sortBy]);

  const uniqueLocations = [...new Set(tasks.map(t => t.location).filter(Boolean))];
  const uniqueCauses = [...new Set(tasks.map(t => t.cause).filter(Boolean))];

  const urgencyMap = {
    high: { label: 'Urgent', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
    medium: { label: 'Active', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    low: { label: 'Open', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  };

  const handleApplyDone = (taskId) => {
    setAppliedIds(prev => new Set([...prev, String(taskId)]));
    setSelectedTask(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Volunteer Opportunities</h1>
        <p className="page-subtitle">Browse NGO requests and apply — ranked by how well they match your profile</p>
      </div>

      {/* Your skills strip */}
      {profile?.skills?.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '0.75rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Skills:</span>
          {profile.skills.map(s => (
            <span key={s} style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold-mid)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{s}</span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <input
          className="form-input"
          style={{ flex: 1, minWidth: 200, height: 40 }}
          placeholder="🔍 Search by title, NGO, or cause..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select" style={{ height: 40 }} value={filterCause} onChange={e => setFilterCause(e.target.value)}>
          <option value="">All Causes</option>
          {uniqueCauses.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-select" style={{ height: 40 }} value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
          <option value="">All Cities</option>
          {uniqueLocations.map(l => <option key={l}>{l}</option>)}
        </select>
        <select className="form-select" style={{ height: 40 }} value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
          <option value="">Any Urgency</option>
          <option value="high">🔴 Urgent</option>
          <option value="medium">🟡 Active</option>
          <option value="low">🟢 Open</option>
        </select>
        <button
          onClick={() => setOnlyMySkills(v => !v)}
          style={{
            height: 40, padding: '0 1rem', borderRadius: 10, border: '1.5px solid',
            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s',
            borderColor: onlyMySkills ? 'var(--gold-mid)' : 'var(--border-color)',
            background: onlyMySkills ? 'rgba(201,168,76,0.1)' : 'var(--bg-input)',
            color: onlyMySkills ? 'var(--gold-mid)' : 'var(--text-secondary)',
          }}
        >
          ✨ My Skills Only
        </button>
        <select className="form-select" style={{ height: 40 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="match">Sort: Best Match</option>
          <option value="urgency">Sort: Most Urgent</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {/* Results count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
          {scoredTasks.length} opportunit{scoredTasks.length === 1 ? 'y' : 'ies'} found
        </span>
        {(search || filterCause || filterLocation || filterUrgency || onlyMySkills) && (
          <button
            onClick={() => { setSearch(''); setFilterCause(''); setFilterLocation(''); setFilterUrgency(''); setOnlyMySkills(false); }}
            style={{ background: 'none', border: 'none', color: 'var(--gold-mid)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 1.5rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading opportunities...</p>
        </div>
      ) : scoredTasks.length === 0 ? (
        <div className="card" style={{ padding: '5rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🔎</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No opportunities found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {scoredTasks.map((task, i) => {
            const isApplied = appliedIds.has(String(task.id));
            const isTopMatch = task.matchScore >= 75 && i === 0;
            const urg = urgencyMap[task.urgency] || urgencyMap.medium;
            const scoreColor = task.matchScore >= 75 ? '#22c55e' : task.matchScore >= 45 ? '#f59e0b' : '#94a3b8';

            return (
              <div key={task.id} className="card card-hover" style={{
                borderRadius: 20, padding: '1.5rem',
                border: `1px solid ${isTopMatch ? 'rgba(201,168,76,0.4)' : 'var(--border-color)'}`,
                background: isTopMatch ? 'rgba(201,168,76,0.03)' : 'var(--bg-card)',
                position: 'relative', overflow: 'hidden',
              }}>
                {isTopMatch && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--gold-grad)' }} />
                )}
                {isTopMatch && (
                  <div style={{ position: 'absolute', top: 14, right: 16, background: 'var(--gold-grad)', color: '#1a0e05', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20, letterSpacing: 0.5 }}>
                    ⭐ TOP MATCH
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3 }}>
                      {task.ngo_name}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{task.title}</h3>
                  </div>
                  {/* Match score circle */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: `conic-gradient(${scoreColor} ${task.matchScore * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 800, color: scoreColor,
                      }}>{task.matchScore}%</div>
                    </div>
                    <span style={{ background: urg.bg, color: urg.color, padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                      {urg.label}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  {task.description}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {task.location && <span>📍 {task.location}{task.state ? `, ${task.state}` : ''}</span>}
                  {task.availability && <span>🕐 {task.availability}</span>}
                  {task.cause && <span>🎯 {task.cause}</span>}
                  {task.min_experience && <span>💼 {task.min_experience}</span>}
                  {task.spots && <span>👥 {task.spots} spot{task.spots > 1 ? 's' : ''}</span>}
                  {task.deadline && <span>⏰ Deadline: {task.deadline}</span>}
                </div>

                {task.required_skills?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                    {task.required_skills.map(s => {
                      const has = task.matchedSkills.includes(s) || (profile?.skills || []).map(x => x.toLowerCase()).includes(s.toLowerCase());
                      return (
                        <span key={s} style={{
                          padding: '3px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700,
                          background: has ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                          color: has ? '#4ade80' : 'var(--text-muted)',
                          border: `1px solid ${has ? 'rgba(34,197,94,0.2)' : 'var(--border-color)'}`,
                        }}>
                          {has ? '✓ ' : ''}{s}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => !isApplied && setSelectedTask(task)}
                    disabled={isApplied}
                    className={isApplied ? 'btn btn-secondary' : 'btn btn-primary'}
                    style={{ opacity: isApplied ? 0.7 : 1, cursor: isApplied ? 'default' : 'pointer' }}
                  >
                    {isApplied ? '✓ Applied' : 'Apply Now →'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <ApplyModal
          task={selectedTask}
          matchScore={selectedTask.matchScore}
          matchedSkills={selectedTask.matchedSkills}
          profile={profile}
          onClose={() => setSelectedTask(null)}
          onDone={() => handleApplyDone(selectedTask.id)}
        />
      )}
    </div>
  );
};

export default NGORequests;
