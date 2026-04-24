import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Calendar, ShieldCheck, CheckCircle2, XCircle, Clock, Trophy, Zap, Search, Filter, ArrowUpRight } from 'lucide-react';

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
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Match Quality</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{percent >= 80 ? 'Exceptional' : percent >= 40 ? 'Qualified' : 'Requires Review'}</span>
      </div>
    </div>
  );
};

const NGODashboard = () => {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchApplications();

    const channel = supabase
      .channel('ngo_apps_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ngo_applications' }, () => {
        fetchApplications();
        toast('New volunteer application received! 🔔', { icon: '👏' });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function fetchApplications() {
    try {
      const { data, error } = await supabase
        .from('ngo_applications')
        .select('*')
        .order('match_score', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (id, status) => {
    const loadingToast = toast.loading('Updating status...');
    try {
      const { error } = await supabase
        .from('ngo_applications')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Application ${status}`, { id: loadingToast });
      setApplications(apps => apps.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      toast.error('Update failed', { id: loadingToast });
    }
  };

  const filtered = applications.filter(a => {
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchSearch = !search || 
      a.volunteer_name.toLowerCase().includes(search.toLowerCase()) || 
      a.task_title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (profile?.role !== 'ngo' && profile?.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: '5rem 2rem', textAlign: 'center', borderRadius: '24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <Zap size={40} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem' }}>NGO Portal Restricted</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>This dashboard is only available to verified NGO representatives and platform administrators.</p>
          <button onClick={() => window.location.href='/tasks'} className="btn btn-primary">Go to Task Board</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Applicant Management</h1>
          <p className="page-subtitle" style={{ fontSize: '1.1rem' }}>Review, rank and select the best volunteers for your tasks</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="stat-card" style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '14px' }}>
             <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pending</div>
             <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>{applications.filter(a => a.status === 'pending').length}</div>
          </div>
          <div className="stat-card" style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '14px' }}>
             <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</div>
             <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold-mid)' }}>{applications.length}</div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" placeholder="Search by volunteer name or task..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.8rem', height: '44px', borderRadius: '10px' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              height: '44px', padding: '0 1.25rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.2s',
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
          <p style={{ color: 'var(--text-muted)' }}>Retrieving latest applications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '5rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📂</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>No applications found</h3>
          <p style={{ color: 'var(--text-muted)' }}>Try changing your filters or wait for new volunteers to apply.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {filtered.map(app => (
            <div key={app.id} className="card card-hover" style={{
              borderRadius: '24px', padding: '1.75rem', border: '1px solid var(--border-color)',
              background: app.status === 'approved' ? 'rgba(34,197,94,0.02)' : 'var(--bg-card)',
              position: 'relative', overflow: 'hidden'
            }}>
              {/* Highlight bar for top matches */}
              {app.match_score >= 80 && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--gold-grad)' }} />
              )}

              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                {/* Volunteer Avatar */}
                <div style={{ width: 64, height: 64, borderRadius: '20px', background: 'var(--primary-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 800, flexShrink: 0, color: 'white' }}>
                  {app.volunteer_name.charAt(0)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{app.volunteer_name}</h3>
                        <ShieldCheck size={18} style={{ color: '#c9a84c' }} />
                        {app.status !== 'pending' && (
                          <span style={{ 
                            fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: app.status === 'approved' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            color: app.status === 'approved' ? '#4ade80' : '#f87171',
                            border: `1px solid ${app.status === 'approved' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
                          }}>
                            {app.status}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <strong>Applying for:</strong> <span style={{ color: 'var(--gold-mid)', fontWeight: 600 }}>{app.task_title}</span>
                      </div>
                    </div>
                    <MatchIndicator percent={app.match_score} />
                  </div>

                  {/* Details Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Mail size={16} style={{ color: 'var(--text-muted)' }} /> {app.volunteer_email}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Phone size={16} style={{ color: 'var(--text-muted)' }} /> {app.phone}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={16} style={{ color: 'var(--text-muted)' }} /> {app.address}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Calendar size={16} style={{ color: 'var(--text-muted)' }} /> DOB: {app.dob}
                    </div>
                  </div>

                  {/* ID Verification Badge */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                     <ShieldCheck size={14} /> ID Verified: {app.id_proof_type} ({app.id_proof_number})
                  </div>

                  {/* Message Box */}
                  {app.message && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', position: 'relative' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold-mid)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Personal Message</div>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{app.message}"</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={14} /> Received {new Date(app.created_at).toLocaleDateString()} at {new Date(app.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {app.status === 'pending' ? (
                        <>
                          <button onClick={() => handleUpdateStatus(app.id, 'rejected')} className="btn btn-secondary" style={{ height: '44px', padding: '0 1.5rem', borderRadius: '12px', color: '#ef4444' }}>
                            <XCircle size={18} style={{ marginRight: '0.5rem' }} /> Decline
                          </button>
                          <button onClick={() => handleUpdateStatus(app.id, 'approved')} className="btn btn-primary" style={{ height: '44px', padding: '0 2rem', borderRadius: '12px', fontWeight: 700 }}>
                            <CheckCircle2 size={18} style={{ marginRight: '0.5rem' }} /> Approve Volunteer
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleUpdateStatus(app.id, 'pending')} className="btn btn-secondary" style={{ height: '44px', borderRadius: '12px' }}>
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
