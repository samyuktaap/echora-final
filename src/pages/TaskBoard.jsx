// src/pages/TaskBoard.jsx
import React, { useState, useEffect } from 'react';
import { mockNGORequests, INDIA_STATES, SKILLS_LIST } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { MapPin, Clock, Users, Briefcase, Calendar, Check, Search, Filter, SlidersHorizontal, ArrowRight } from 'lucide-react';

// ── SCORING FUNCTION ──────────────────────────────────────────────────────────
export function calculateMatchScore(volunteer, task) {
  let score = 0;
  const matchedSkills = (task.requiredSkills || []).filter(skill => (volunteer.skills || []).includes(skill));
  score += matchedSkills.length * 40;
  score += Math.min((volunteer.points || 0) / 10, 30);
  score += Math.min((volunteer.badges || []).length * 10, 30);
  if (volunteer.experience === 'Expert') score += 20;
  else if (volunteer.experience === 'Intermediate') score += 10;
  score += Math.min((volunteer.tasksCompleted || 0) * 2, 20);
  return Math.round(score);
}

const MatchIndicator = ({ percent }) => {
  const color = percent > 80 ? '#22c55e' : percent > 40 ? '#f59e0b' : '#ef4444';
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
        {percent >= 80 ? 'Perfect fit' : percent >= 40 ? 'Partial fit' : 'Low match'}
      </span>
    </div>
  );
};

const TaskBoard = () => {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) return;
    async function fetchProfile() {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setMySkills(data.skills || []);
        setVolunteerProfile(data);
      }
      const { data: apps } = await supabase.from('ngo_applications').select('task_id').eq('volunteer_id', user.id);
      if (apps) setApplied(new Set(apps.map(a => String(a.task_id))));
    }
    fetchProfile();
  }, [user]);

  const filtered = mockNGORequests.filter(t => {
    const matchState = !filterState || t.state === filterState;
    const matchSkill = !filterSkill || t.requiredSkills?.includes(filterSkill);
    const matchSearch = !search || t.ngoName.toLowerCase().includes(search.toLowerCase()) || t.taskDescription.toLowerCase().includes(search.toLowerCase());
    const matchMySkills = !showMySkillsOnly || (mySkills.length > 0 && t.requiredSkills?.some(s => mySkills.includes(s)));
    return matchState && matchSkill && matchSearch && matchMySkills;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'match' && volunteerProfile) return calculateMatchScore(volunteerProfile, b) - calculateMatchScore(volunteerProfile, a);
    return 0;
  });

  const getMatchPercent = (task) => {
    if (!mySkills.length || !task.requiredSkills?.length) return 0;
    const matched = task.requiredSkills.filter(s => mySkills.includes(s));
    return Math.round((matched.length / task.requiredSkills.length) * 100);
  };

  const handleApply = async (task) => {
    if (!user) { toast.error('Please log in first'); return; }
    setApplyingId(task.id);
    try {
      const { data: details } = await supabase.from('volunteer_details').select('*').eq('id', user.id).single();
      if (!details) { toast.error('Please complete your profile onboarding first!'); return; }
      const matchScore = volunteerProfile ? calculateMatchScore(volunteerProfile, task) : 0;
      const { error } = await supabase.from('ngo_applications').insert({
        volunteer_id: user.id, task_id: String(task.id), task_title: `${task.ngoName} — ${task.taskDescription.slice(0, 60)}`,
        volunteer_name: volunteerProfile?.name || '', volunteer_email: volunteerProfile?.email || '',
        phone: details.phone, address: details.address, dob: details.dob, id_proof_type: details.id_proof_type,
        id_proof_number: details.id_proof_number, message: message, match_score: matchScore, status: 'pending'
      });
      if (error) throw error;
      setApplied(prev => new Set([...prev, String(task.id)]));
      setShowMessageFor(null);
      setMessage('');
      toast.success(`✅ Applied! Match score: ${matchScore} pts 🎯`);
    } catch (err) { toast.error(err.message || 'Application failed'); }
    finally { setApplyingId(null); }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '2.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '2.2rem', fontWeight: 800 }}>Explore Opportunities</h1>
        <p className="page-subtitle" style={{ fontSize: '1.05rem' }}>Find verified volunteering tasks that match your unique skillset</p>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search NGOs, tasks, or cities..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.8rem', height: '48px', borderRadius: '12px' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select className="form-select" value={filterState} onChange={e => setFilterState(e.target.value)} style={{ height: '48px', borderRadius: '12px', minWidth: '140px' }}>
            <option value="">All States</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ height: '48px', borderRadius: '12px', minWidth: '140px' }}>
            <option value="match">Best Match</option>
            <option value="newest">Newest First</option>
          </select>
          <button onClick={() => setShowMySkillsOnly(!showMySkillsOnly)} style={{ height: '48px', borderRadius: '12px', padding: '0 1rem', background: showMySkillsOnly ? 'var(--gold-grad)' : 'rgba(255,255,255,0.05)', color: showMySkillsOnly ? '#1a0e05' : 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
             <SlidersHorizontal size={16} /> {showMySkillsOnly ? 'Matches Only' : 'All Tasks'}
          </button>
        </div>
      </div>

      {/* TASK LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {sorted.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>No opportunities found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filters to see more results.</p>
          </div>
        ) : sorted.map(task => {
          const matchPct = getMatchPercent(task);
          const isApplied = applied.has(String(task.id));
          const showMsg = showMessageFor === task.id;

          return (
            <div key={task.id} className="card card-hover" style={{ borderRadius: '20px', padding: '1.75rem', border: '1px solid var(--border-color)', position: 'relative' }}>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                {/* NGO Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--primary-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                        {task.ngoName.charAt(0)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{task.ngoName}</h3>
                          <Check size={14} style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)', borderRadius: '50%', padding: '2px' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{task.taskDescription.split('—')[0].split('-')[0].trim()}</h2>
                          {task.urgency === 'High' && (
                            <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} /> Urgent
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <MatchIndicator percent={matchPct} />
                  </div>

                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {task.taskDescription}
                  </p>

                  {/* Stats Bar */}
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '0.75rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <MapPin size={14} /> {task.location}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Clock size={14} /> Flexible
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Briefcase size={14} /> 1+ yr exp
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <Users size={14} /> 6 spots left
                    </div>
                  </div>

                  {/* Skills Tags */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {task.requiredSkills?.map(s => (
                      <span key={s} style={{ 
                        background: mySkills.includes(s) ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                        color: mySkills.includes(s) ? '#4ade80' : 'var(--text-muted)',
                        border: `1px solid ${mySkills.includes(s) ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'}`,
                        padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.3rem'
                      }}>
                        {mySkills.includes(s) && <Check size={12} />} {s}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Posted {task.createdAt} · <span style={{ color: 'var(--text-secondary)' }}>Deadline: May 2026</span>
                    </div>
                    
                    {!isApplied ? (
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {showMsg ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                             <input className="form-input" placeholder="Message..." value={message} onChange={e => setMessage(e.target.value)} style={{ height: '44px', width: '200px' }} />
                             <button onClick={() => handleApply(task)} className="btn btn-primary" style={{ height: '44px', borderRadius: '12px' }} disabled={applyingId === task.id}>
                                {applyingId === task.id ? '...' : 'Confirm'}
                             </button>
                             <button onClick={() => setShowMessageFor(null)} className="btn btn-secondary" style={{ height: '44px', width: '44px', padding: 0 }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setShowMessageFor(task.id)} className="btn btn-primary" style={{ height: '44px', padding: '0 2rem', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                             Apply Now <ArrowRight size={16} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(34,197,94,0.1)', color: '#4ade80', padding: '0.6rem 1.5rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem' }}>
                        ✓ Applied
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard;
