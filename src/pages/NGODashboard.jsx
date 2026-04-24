import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Calendar, ShieldCheck, CheckCircle2, XCircle, Clock, Zap, Search } from 'lucide-react';

const MatchIndicator = ({ percent }) => {
  const color = percent > 80 ? '#22c55e' : percent > 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ position: 'relative', width: 36, height: 36 }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <circle cx="18" cy="18" r="16" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${percent}, 100`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800 }}>{percent}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Match</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{percent >= 80 ? 'Exceptional' : percent >= 40 ? 'Qualified' : 'Low Match'}</span>
      </div>
    </div>
  );
};

const NGODashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTaskId, setFilterTaskId] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchAll();

    // Realtime: new application comes in
    const channel = supabase
      .channel('ngo_apps_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ngo_applications', filter: `ngo_id=eq.${user.id}` }, () => {
        fetchAll();
        toast('New volunteer application received! 🔔', { icon: '👏' });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function fetchAll() {
    try {
      // Fetch this NGO's tasks
      const { data: tasks, error: tasksErr } = await supabase
        .from('ngo_tasks')
        .select('id, title, urgency, active')
        .eq('ngo_id', user.id)
        .order('created_at', { ascending: false });

      if (tasksErr) throw tasksErr;
      setMyTasks(tasks || []);

      // Fetch applications for this NGO
      const { data: apps, error: appsErr } = await supabase
        .from('ngo_applications')
        .select('*')
        .eq('ngo_id', user.id)
        .order('match_score', { ascending: false });

      if (appsErr) throw appsErr;
      setApplications(apps || []);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (id, status) => {
    const t = toast.loading('Updating...');
    try {
      const { error } = await supabase
        .from('ngo_applications')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Application ${status}`, { id: t });
      setApplications(apps => apps.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      toast.error('Update failed', { id: t });
    }
  };

  const handleToggleTask = async (taskId, active) => {
    await supabase.from('ngo_tasks').update({ active: !active }).eq('id', taskId);
    setMyTasks(t => t.map(x => x.id === taskId ? { ...x, active: !active } : x));
    toast.success(active ? 'Post paused' : 'Post activated');
  };

  const filtered = applications.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterTaskId !== 'all' && a.task_id !== filterTaskId) return false;
    if (search && !a.volunteer_name?.toLowerCase().includes(search.toLowerCase()) && !a.task_title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (profile?.role !== 'ngo' && profile?.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: '5rem 2rem', textAlign: 'center', borderRadius: '24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <Zap size={40} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem' }}>NGO Portal Only</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
            This dashboard is only for NGO accounts. Your account is set to <strong>{profile?.role || 'volunteer'}</strong>.
          </p>
          <button onClick={() => navigate('/tasks')} className="btn btn-primary">Go to Task Board</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 800 }}>NGO Dashboard</h1>
          <p className="page-subtitle">Your posted opportunities & incoming applications</p>
        </div>
        <button onClick={() => navigate('/ngo-form')} className="btn btn-primary">
          + Post New Opportunity
        </button>
      </div>

      {/* My Posts summary */}
      {myTasks.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Your Posts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {myTasks.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 10, padding: '0.4rem 0.75rem', fontSize: '0.82rem',
              }}>
                <span style={{ fontWeight: 600 }}>{t.title}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{ fontSize: 11, color: t.active ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                  {t.active ? 'Live' : 'Paused'}
                </span>
                <button
                  onClick={() => handleToggleTask(t.id, t.active)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                >
                  {t.active ? 'Pause' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total', val: applications.length, color: 'var(--gold-mid)' },
          { label: 'Pending', val: applications.filter(a => a.status === 'pending').length, color: '#f59e0b' },
          { label: 'Approved', val: applications.filter(a => a.status === 'approved').length, color: '#22c55e' },
          { label: 'Rejected', val: applications.filter(a => a.status === 'rejected').length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 14, padding: '0.75rem 1.25rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Control bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search by name or task..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem', height: 40 }} />
        </div>

        {/* Filter by task */}
        {myTasks.length > 1 && (
          <select className="form-select" style={{ height: 40 }} value={filterTaskId} onChange={e => setFilterTaskId(e.target.value)}>
            <option value="all">All Posts</option>
            {myTasks.map(t => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
          </select>
        )}

        {/* Filter by status */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              height: 40, padding: '0 1rem', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600,
              textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.15s',
              background: filterStatus === s ? 'var(--gold-grad)' : 'rgba(255,255,255,0.05)',
              color: filterStatus === s ? '#1a0e05' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <div className="spinner" style={{ width: 48, height: 48, margin: '0 auto 1.5rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '5rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📂</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No applications yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {myTasks.length === 0
              ? 'Post a volunteer opportunity first so volunteers can apply.'
              : 'Volunteers will appear here once they apply to your posts.'}
          </p>
          {myTasks.length === 0 && (
            <button onClick={() => navigate('/ngo-form')} className="btn btn-primary">Post First Opportunity</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {filtered.map(app => (
            <div key={app.id} className="card card-hover" style={{
              borderRadius: '20px', padding: '1.5rem',
              border: `1px solid ${app.status === 'approved' ? 'rgba(34,197,94,0.2)' : 'var(--border-color)'}`,
              background: app.status === 'approved' ? 'rgba(34,197,94,0.02)' : 'var(--bg-card)',
              position: 'relative', overflow: 'hidden',
            }}>
              {app.match_score >= 80 && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--gold-grad)' }} />
              )}

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                {/* Avatar */}
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                  {app.volunteer_name?.charAt(0) || '?'}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{app.volunteer_name}</h3>
                        {app.status !== 'pending' && (
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                            background: app.status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: app.status === 'approved' ? '#4ade80' : '#f87171',
                            border: `1px solid ${app.status === 'approved' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                          }}>{app.status}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Applying for: <span style={{ color: 'var(--gold-mid)', fontWeight: 600 }}>{app.task_title}</span>
                      </div>
                    </div>
                    <MatchIndicator percent={app.match_score} />
                  </div>

                  {/* Contact details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {app.volunteer_email && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} style={{ color: 'var(--text-muted)' }} />{app.volunteer_email}</div>}
                    {app.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} style={{ color: 'var(--text-muted)' }} />{app.phone}</div>}
                    {app.address && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} style={{ color: 'var(--text-muted)' }} />{app.address}</div>}
                    {app.dob && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} style={{ color: 'var(--text-muted)' }} />DOB: {app.dob}</div>}
                  </div>

                  {app.message && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold-mid)', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Message</div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{app.message}"</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} />
                      {new Date(app.created_at).toLocaleDateString('en-IN')} at {new Date(app.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      {app.status === 'pending' ? (
                        <>
                          <button onClick={() => handleUpdateStatus(app.id, 'rejected')} className="btn btn-secondary" style={{ height: 40, padding: '0 1.25rem', borderRadius: 10, color: '#ef4444' }}>
                            <XCircle size={16} style={{ marginRight: 4 }} /> Decline
                          </button>
                          <button onClick={() => handleUpdateStatus(app.id, 'approved')} className="btn btn-primary" style={{ height: 40, padding: '0 1.5rem', borderRadius: 10 }}>
                            <CheckCircle2 size={16} style={{ marginRight: 4 }} /> Approve
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleUpdateStatus(app.id, 'pending')} className="btn btn-secondary" style={{ height: 40, borderRadius: 10 }}>
                          Reset to Pending
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NGODashboard;
