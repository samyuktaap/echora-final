// src/pages/TaskBoard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { MapPin, Clock, Users, Briefcase, Calendar, Check, Search, Filter, SlidersHorizontal, ArrowRight, Zap, Target } from 'lucide-react';
import { INDIA_STATES } from '../data/mockData';

// ── SCORING FUNCTION ──────────────────────────────────────────────────────────
export function calculateMatchScore(profile, task) {
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
  if (myCity && taskCity && (myCity === taskCity || myCity.includes(taskCity) || taskCity.includes(myCity))) {
    score += 30;
  }

  // Points & Experience — 20pts
  score += Math.min((profile.points || 0) / 50, 10);
  const expRank = { Beginner: 0, Intermediate: 1, Expert: 2 };
  if ((expRank[profile.experience] || 0) >= (expRank[task.min_experience] || 0)) {
    score += 10;
  }

  return Math.min(score, 100);
}

const MatchIndicator = ({ percent }) => {
  const color = percent >= 80 ? '#22c55e' : percent >= 45 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ position: 'relative', width: 32, height: 32 }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${percent}, 100`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>{percent}</div>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {percent >= 80 ? 'Perfect match' : percent >= 45 ? 'Qualified' : 'Requires review'}
      </span>
    </div>
  );
};

const TaskBoard = () => {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterCause, setFilterCause] = useState('');
  const [showMySkillsOnly, setShowMySkillsOnly] = useState(false);
  const [sortBy, setSortBy] = useState('match');
  const [applyingId, setApplyingId] = useState(null);
  const [message, setMessage] = useState('');
  const [showMessageFor, setShowMessageFor] = useState(null);

  useEffect(() => {
    fetchTasks();
    if (user) fetchApplications();
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

  async function fetchApplications() {
    try {
      const { data } = await supabase
        .from('ngo_applications')
        .select('task_id')
        .eq('volunteer_id', user.id);

      if (data) setAppliedIds(new Set(data.map(a => String(a.task_id))));
    } catch {}
  }

  const scoredTasks = useMemo(() => {
    return tasks
      .map(t => ({
        ...t,
        matchScore: calculateMatchScore(profile, t),
        matchedSkills: (t.required_skills || []).filter(s => (profile?.skills || []).map(x => x.toLowerCase()).includes(s.toLowerCase()))
      }))
      .filter(t => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.ngo_name?.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterState && t.state !== filterState) return false;
        if (filterCause && t.cause !== filterCause) return false;
        if (showMySkillsOnly && t.matchedSkills.length === 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'match') return b.matchScore - a.matchScore;
        if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
        if (sortBy === 'urgency') {
          const u = { high: 3, medium: 2, low: 1 };
          return u[b.urgency] - u[a.urgency];
        }
        return 0;
      });
  }, [tasks, profile, search, filterState, filterCause, showMySkillsOnly, sortBy]);

  const uniqueCauses = [...new Set(tasks.map(t => t.cause).filter(Boolean))];

  const handleApply = async (task) => {
    if (!user) { toast.error('Please log in first'); return; }
    setApplyingId(task.id);
    try {
      // Ensure volunteer details exist
      let { data: details } = await supabase.from('volunteer_details').select('*').eq('id', user.id).single();
      
      if (!details) {
        const mockDetails = {
          id: user.id,
          phone: '+91 99999 00000',
          address: profile?.location || 'India',
          dob: '2000-01-01',
          id_proof_type: 'Aadhar',
          id_proof_number: 'XXXX-XXXX-1234'
        };
        const { data: newDetails, error: insErr } = await supabase.from('volunteer_details').insert(mockDetails).select().single();
        if (insErr) throw insErr;
        details = newDetails;
      }

      const { error } = await supabase.from('ngo_applications').insert({
        volunteer_id: user.id,
        ngo_id: task.ngo_id,
        task_id: String(task.id),
        task_title: task.title,
        volunteer_name: profile?.name || '',
        volunteer_email: user.email || '',
        phone: details.phone,
        address: details.address,
        dob: details.dob,
        id_proof_type: details.id_proof_type,
        id_proof_number: details.id_proof_number,
        message,
        match_score: task.matchScore,
        status: 'pending'
      });

      if (error) throw error;
      setAppliedIds(prev => new Set([...prev, String(task.id)]));
      setShowMessageFor(null);
      setMessage('');
      toast.success('Application submitted! 🎯');
    } catch (err) {
      toast.error('Failed to apply: ' + err.message);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <Zap style={{ color: 'var(--gold-mid)' }} size={20} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold-mid)', letterSpacing: '0.1em' }}>Opportunity Explorer</span>
        </div>
        <h1 className="page-title" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Find Your Next Mission</h1>
        <p className="page-subtitle" style={{ fontSize: '1.1rem' }}>We've matched your skills with these high-impact tasks across India.</p>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search NGOs or roles..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.8rem', height: '44px', borderRadius: '10px' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select className="form-select" value={filterState} onChange={e => setFilterState(e.target.value)} style={{ height: '44px', borderRadius: '10px', minWidth: '130px' }}>
            <option value="">All States</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" value={filterCause} onChange={e => setFilterCause(e.target.value)} style={{ height: '44px', borderRadius: '10px', minWidth: '130px' }}>
            <option value="">All Causes</option>
            {uniqueCauses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: '44px', borderRadius: '10px' }}>
            <option value="match">Sort: Match Score</option>
            <option value="urgency">Sort: Urgency</option>
            <option value="newest">Sort: Newest</option>
          </select>
          <button onClick={() => setShowMySkillsOnly(!showMySkillsOnly)} style={{ height: '44px', borderRadius: '10px', padding: '0 1rem', background: showMySkillsOnly ? 'rgba(201,168,76,0.1)' : 'transparent', color: showMySkillsOnly ? 'var(--gold-mid)' : 'var(--text-muted)', border: '1px solid', borderColor: showMySkillsOnly ? 'var(--gold-mid)' : 'var(--border-color)', fontWeight: 600, cursor: 'pointer' }}>
             {showMySkillsOnly ? '✨ Skill Matches' : 'All Tasks'}
          </button>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 1.5rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Fetching the best matches for you...</p>
        </div>
      ) : scoredTasks.length === 0 ? (
        <div className="card" style={{ padding: '5rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.3 }}>🔍</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>No opportunities found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {scoredTasks.map((task, i) => {
            const isApplied = appliedIds.has(String(task.id));
            const showMsg = showMessageFor === task.id;
            const isTopMatch = i === 0 && task.matchScore >= 80;

            return (
              <div key={task.id} className="card card-hover" style={{ 
                borderRadius: '24px', padding: '1.75rem', border: '1px solid var(--border-color)', position: 'relative',
                background: isTopMatch ? 'rgba(201,168,76,0.02)' : 'var(--bg-card)',
                boxShadow: isTopMatch ? '0 0 40px rgba(201,168,76,0.05)' : 'none'
              }}>
                {isTopMatch && (
                  <div style={{ position: 'absolute', top: 12, right: 20, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold-mid)', fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <Target size={14} /> Recommended Match
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                         <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--primary-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, color: 'white' }}>
                           {task.ngo_name?.charAt(0) || 'N'}
                         </div>
                         <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{task.ngo_name}</div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', margin: 0 }}>{task.title}</h2>
                         </div>
                      </div>
                      <MatchIndicator percent={task.matchScore} />
                    </div>

                    <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                      {task.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                         <MapPin size={14} /> {task.location}
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                         <Clock size={14} /> {task.availability}
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                         <Users size={14} /> {task.spots} spots
                       </div>
                       {task.deadline && (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                           <Calendar size={14} /> Deadline: {task.deadline}
                         </div>
                       )}
                    </div>

                    {/* Skills */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
                      {task.required_skills?.map(s => {
                        const isMatch = task.matchedSkills.includes(s);
                        return (
                          <span key={s} style={{ 
                            background: isMatch ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                            color: isMatch ? '#4ade80' : 'var(--text-muted)',
                            border: '1px solid', borderColor: isMatch ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                            padding: '0.35rem 0.75rem', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '0.3rem'
                          }}>
                            {isMatch && <Check size={12} />} {s}
                          </span>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                         Urgency: <span style={{ color: task.urgency === 'high' ? '#ef4444' : task.urgency === 'medium' ? '#f59e0b' : '#22c55e', fontWeight: 700, textTransform: 'uppercase' }}>{task.urgency}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {isApplied ? (
                          <div style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Check size={18} /> Applied
                          </div>
                        ) : showMsg ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                             <input className="form-input" placeholder="Add a message..." value={message} onChange={e => setMessage(e.target.value)} style={{ height: '44px', width: '220px' }} />
                             <button onClick={() => handleApply(task)} className="btn btn-primary" disabled={applyingId === task.id}>
                                {applyingId === task.id ? '...' : 'Confirm'}
                             </button>
                             <button onClick={() => setShowMessageFor(null)} className="btn btn-secondary" style={{ width: '44px', padding: 0 }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setShowMessageFor(task.id)} className="btn btn-primary btn-lg" style={{ padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                             Apply Now <ArrowRight size={18} />
                          </button>
                        )}
                      </div>
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
