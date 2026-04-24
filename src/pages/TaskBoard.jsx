// src/pages/TaskBoard.jsx
import React, { useState, useEffect } from 'react';
import { mockNGORequests, INDIA_STATES, SKILLS_LIST } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const UrgencyBadge = ({ urgency }) => (
  <span className={`badge urgency-${urgency.toLowerCase()}`}>
    {urgency === 'High' ? '🔴' : urgency === 'Medium' ? '🟡' : '🟢'} {urgency}
  </span>
);

// ── SCORING FUNCTION ──────────────────────────────────────────────────────────
// Higher score = better match. NGO sees TOP applicants ranked by this.
export function calculateMatchScore(volunteer, task) {
  let score = 0;

  // 1. Skills match — 40 pts per matching skill
  const matchedSkills = (task.requiredSkills || []).filter(skill =>
    (volunteer.skills || []).includes(skill)
  );
  score += matchedSkills.length * 40;

  // 2. Points — leaderboard score (max 30 pts)
  score += Math.min((volunteer.points || 0) / 10, 30);

  // 3. Badges — 10 pts each (max 30 pts)
  score += Math.min((volunteer.badges || []).length * 10, 30);

  // 4. Experience bonus
  if (volunteer.experience === 'Expert') score += 20;
  else if (volunteer.experience === 'Intermediate') score += 10;
  else score += 0; // Beginner

  // 5. Tasks completed bonus — 2 pts each (max 20)
  score += Math.min((volunteer.tasksCompleted || 0) * 2, 20);

  return Math.round(score);
}
// ─────────────────────────────────────────────────────────────────────────────

const TaskBoard = () => {
  const { user } = useAuth();
  const [filterUrgency, setFilterUrgency] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState(new Set());
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState('match');
  const [mySkills, setMySkills] = useState([]);
  const [showMySkillsOnly, setShowMySkillsOnly] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [message, setMessage] = useState('');
  const [showMessageFor, setShowMessageFor] = useState(null);
  const [volunteerProfile, setVolunteerProfile] = useState(null);

  // Fetch logged-in volunteer's profile from Supabase
  useEffect(() => {
    if (!user) return;
    async function fetchProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('skills, points, badges, experience, name, email, tasksCompleted:tasks_completed')
        .eq('id', user.id)
        .single();

      if (data) {
        setMySkills(data.skills || []);
        setVolunteerProfile(data);
      }

      // Fetch already-applied task IDs
      const { data: apps } = await supabase
        .from('ngo_applications')
        .select('task_id')
        .eq('volunteer_id', user.id);

      if (apps) setApplied(new Set(apps.map(a => String(a.task_id))));
    }
    fetchProfile();
  }, [user]);

  // ── Filter tasks ────────────────────────────────────────────────────────────
  const filtered = mockNGORequests.filter(t => {
    const matchUrgency = !filterUrgency || t.urgency === filterUrgency;
    const matchState = !filterState || t.state === filterState;
    const matchSkill = !filterSkill || t.requiredSkills?.includes(filterSkill);
    const matchSearch = !search ||
      t.ngoName.toLowerCase().includes(search.toLowerCase()) ||
      t.taskDescription.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase());
    const matchMySkills = !showMySkillsOnly ||
      (mySkills.length > 0 && t.requiredSkills?.some(s => mySkills.includes(s)));
    return matchUrgency && matchState && matchSkill && matchSearch && matchMySkills;
  });

  // ── Sort tasks ──────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'urgent') {
      const urgencyMap = { 'High': 0, 'Medium': 1, 'Low': 2 };
      return urgencyMap[a.urgency] - urgencyMap[b.urgency];
    }
    if (sortBy === 'match' && volunteerProfile) {
      return calculateMatchScore(volunteerProfile, b) - calculateMatchScore(volunteerProfile, a);
    }
    return 0;
  });

  // ── Match % for display ─────────────────────────────────────────────────────
  const getMatchPercent = (task) => {
    if (!mySkills.length || !task.requiredSkills?.length) return 0;
    const matched = task.requiredSkills.filter(s => mySkills.includes(s));
    return Math.round((matched.length / task.requiredSkills.length) * 100);
  };

  // ── REAL APPLY — saves to Supabase with match score ─────────────────────────
  const handleApply = async (task) => {
    if (!user) { toast.error('Please log in first'); return; }
    if (applied.has(String(task.id))) { toast.error('Already applied!'); return; }

    setApplyingId(task.id);
    try {
      // 1. Get volunteer's saved onboarding details
      const { data: details, error: detailsError } = await supabase
        .from('volunteer_details')
        .select('*')
        .eq('id', user.id)
        .single();

      if (detailsError || !details) {
        toast.error('Please complete your profile onboarding first!');
        return;
      }

      // 2. Calculate match score
      const matchScore = volunteerProfile
        ? calculateMatchScore(volunteerProfile, task)
        : 0;

      // 3. Save application to Supabase
      const { error } = await supabase
        .from('ngo_applications')
        .insert({
          volunteer_id:    user.id,
          ngo_id:          null,
          task_id:         String(task.id),
          task_title:      `${task.ngoName} — ${task.taskDescription.slice(0, 60)}`,
          volunteer_name:  volunteerProfile?.name || '',
          volunteer_email: volunteerProfile?.email || '',
          phone:           details.phone,
          address:         details.address,
          dob:             details.dob,
          id_proof_type:   details.id_proof_type,
          id_proof_number: details.id_proof_number,
          message:         message,
          match_score:     matchScore,
          status:          'pending',
        });

      if (error) throw error;

      setApplied(prev => new Set([...prev, String(task.id)]));
      setShowMessageFor(null);
      setMessage('');
      toast.success(`✅ Applied! Your match score: ${matchScore} pts 🎯`);
    } catch (err) {
      toast.error(err.message || 'Application failed');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Task Board</h1>
        <p className="page-subtitle">Browse volunteer opportunities matched to your skills</p>
      </div>

      {/* MY SKILLS BANNER */}
      {mySkills.length > 0 && (
        <div style={{
          background: showMySkillsOnly ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
          border: `1px solid ${showMySkillsOnly ? '#6366f1' : 'var(--border-color)'}`,
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>🎓 Your skills:</span>
            {mySkills.map(s => <span key={s} className="badge badge-primary">{s}</span>)}
            {volunteerProfile?.experience && (
              <span className="badge badge-gray">⭐ {volunteerProfile.experience}</span>
            )}
          </div>
          <button
            onClick={() => setShowMySkillsOnly(p => !p)}
            className={`btn btn-sm ${showMySkillsOnly ? 'btn-primary' : 'btn-secondary'}`}
          >
            {showMySkillsOnly ? '✅ My Matches Only' : '🎯 Show My Matches Only'}
          </button>
        </div>
      )}

      {/* FILTERS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-icon">🔍</span>
          <input
            className="form-input"
            placeholder="Search NGOs, tasks, locations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.4rem', fontSize: '0.82rem' }}
          />
        </div>
        <select className="form-select" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} style={{ maxWidth: 140, fontSize: '0.82rem' }}>
          <option value="">All Urgencies</option>
          <option value="High">🔴 High</option>
          <option value="Medium">🟡 Medium</option>
          <option value="Low">🟢 Low</option>
        </select>
        <select className="form-select" value={filterState} onChange={e => setFilterState(e.target.value)} style={{ maxWidth: 140, fontSize: '0.82rem' }}>
          <option value="">All States</option>
          {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" value={filterSkill} onChange={e => setFilterSkill(e.target.value)} style={{ maxWidth: 140, fontSize: '0.82rem' }}>
          <option value="">All Skills</option>
          {SKILLS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ maxWidth: 140, fontSize: '0.82rem' }}>
          <option value="match">Best Match ⭐</option>
          <option value="newest">Newest</option>
          <option value="urgent">Most Urgent</option>
        </select>
        <span className="badge badge-gray">{sorted.length} tasks</span>
      </div>

      {/* TASK LIST */}
      {sorted.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No tasks match your filters. Try adjusting your search.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sorted.map(task => {
            const matchPct = getMatchPercent(task);
            const isApplied = applied.has(String(task.id));
            const isExpanded = expandedId === task.id;
            const showMsg = showMessageFor === task.id;
            const matchedSkills = (task.requiredSkills || []).filter(s => mySkills.includes(s));

            return (
              <div key={task.id} className="card card-hover" style={{
                borderLeft: matchPct === 100 ? '3px solid #6366f1' :
                            matchPct > 0 ? '3px solid #f59e0b' : '3px solid transparent'
              }}>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>

                      {/* Title + urgency + match % */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{task.ngoName}</h3>
                        <UrgencyBadge urgency={task.urgency} />
                        {matchPct > 0 && (
                          <span className="badge" style={{
                            background: matchPct === 100 ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.2)',
                            color: matchPct === 100 ? '#818cf8' : '#f59e0b',
                            border: `1px solid ${matchPct === 100 ? '#6366f1' : '#f59e0b'}`,
                          }}>
                            🎯 {matchPct}% Match
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                        {task.taskDescription}
                      </p>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <span className="badge badge-gray">📍 {task.location}, {task.state}</span>
                        <span className="badge badge-gray">📅 Posted {task.createdAt}</span>
                        {task.requiredSkills?.map(s => (
                          <span key={s} className="badge" style={{
                            background: mySkills.includes(s) ? 'rgba(99,102,241,0.2)' : 'var(--bg-input)',
                            color: mySkills.includes(s) ? '#818cf8' : 'var(--text-secondary)',
                            border: mySkills.includes(s) ? '1px solid #6366f1' : '1px solid var(--border-color)',
                          }}>
                            {mySkills.includes(s) ? '✅' : ''} {s}
                          </span>
                        ))}
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div style={{ marginTop: '1rem', padding: '1rem 0', borderTop: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>About this opportunity:</strong><br />
                            This is a {task.urgency.toLowerCase()} urgency task at {task.ngoName}. You'll be working on meaningful community impact.
                            <br /><br />
                            <strong style={{ color: 'var(--text-primary)' }}>Required Skills:</strong> {task.requiredSkills?.join(', ')}<br />
                            {matchedSkills.length > 0 && (
                              <><strong style={{ color: '#818cf8' }}>✅ Your matching skills:</strong> {matchedSkills.join(', ')}<br /></>
                            )}
                            <strong style={{ color: 'var(--text-primary)' }}>Location:</strong> {task.location}, {task.state}<br />
                            <strong style={{ color: 'var(--text-primary)' }}>Points if accepted:</strong> <span style={{ color: 'var(--gold-mid)' }}>+25 pts</span>
                            {volunteerProfile && (
                              <><br /><strong style={{ color: 'var(--text-primary)' }}>Your match score:</strong>{' '}
                              <span style={{ color: '#6366f1', fontWeight: 700 }}>
                                {calculateMatchScore(volunteerProfile, task)} pts
                              </span></>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Message box */}
                      {showMsg && !isApplied && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <textarea
                            className="form-textarea"
                            placeholder="Write a short message to the NGO (optional)…"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            rows={2}
                            style={{ minHeight: 60, fontSize: '0.85rem' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : task.id)}
                        className="btn btn-secondary btn-sm"
                      >
                        {isExpanded ? '▲ Less' : '▼ Details'}
                      </button>

                      {!isApplied && !showMsg && (
                        <button
                          onClick={() => setShowMessageFor(task.id)}
                          className="btn btn-primary btn-sm"
                        >
                          Apply
                        </button>
                      )}

                      {showMsg && !isApplied && (
                        <button
                          onClick={() => handleApply(task)}
                          className="btn btn-primary btn-sm"
                          disabled={applyingId === task.id}
                        >
                          {applyingId === task.id ? '…' : '✅ Confirm'}
                        </button>
                      )}

                      {showMsg && !isApplied && (
                        <button
                          onClick={() => { setShowMessageFor(null); setMessage(''); }}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      )}

                      {isApplied && (
                        <button className="btn btn-secondary btn-sm" disabled>
                          ✅ Applied
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskBoard;
