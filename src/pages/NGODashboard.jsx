import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const NGODashboard = () => {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!user) return;
    fetchApplications();

    // Subscribe to new applications in real-time
    const channel = supabase
      .channel('ngo_apps')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ngo_applications' }, () => {
        fetchApplications();
        toast('New volunteer application received! 🔔');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function fetchApplications() {
    try {
      // For testing, we show ALL applications to any logged-in NGO
      // In production, you would filter by .eq('ngo_id', user.id)
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
    try {
      const { error } = await supabase
        .from('ngo_applications')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast.success(`Application ${status}`);
      setApplications(apps => apps.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      toast.error('Update failed');
    }
  };

  const filtered = applications.filter(a => filterStatus === 'all' || a.status === filterStatus);

  if (profile?.role !== 'ngo' && profile?.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body text-center" style={{ padding: '4rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🔒</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>NGO Access Only</h2>
            <p style={{ color: 'var(--text-muted)' }}>Please log in with an NGO account to view volunteer applications.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Volunteer Applications</h1>
          <p className="page-subtitle">Review and rank volunteers for your NGO tasks</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div className="badge badge-primary">{applications.length} Total</div>
          <div className="badge badge-warning">{applications.filter(a => a.status === 'pending').length} Pending</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'capitalize' }}
          >
            {s}
          </button>
        ))}
        <button onClick={fetchApplications} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>🔄 Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>No applications found matching this filter.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {filtered.map(app => (
            <div key={app.id} className="card card-hover" style={{
              borderLeft: app.match_score >= 80 ? '4px solid #6366f1' : '4px solid transparent'
            }}>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{app.volunteer_name}</h3>
                      <span className="badge" style={{
                        background: app.match_score >= 80 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                        color: app.match_score >= 80 ? '#818cf8' : 'var(--text-muted)',
                        border: `1px solid ${app.match_score >= 80 ? '#6366f1' : 'var(--border-color)'}`,
                      }}>
                        🎯 {app.match_score} Match Score
                      </span>
                      <span className={`badge urgency-${app.status === 'pending' ? 'medium' : app.status === 'approved' ? 'low' : 'high'}`}>
                        {app.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      <strong>Applying for:</strong> <span style={{ color: 'var(--gold-mid)' }}>{app.task_title}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div className="badge badge-gray">📧 {app.volunteer_email}</div>
                      <div className="badge badge-gray">📞 {app.phone}</div>
                      <div className="badge badge-gray">📍 {app.address}</div>
                      <div className="badge badge-gray">🎂 DOB: {app.dob}</div>
                      <div className="badge badge-gray">🆔 {app.id_proof_type}: {app.id_proof_number}</div>
                    </div>

                    {app.message && (
                      <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', opacity: 0.6 }}>Message:</strong>
                        {app.message}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {app.status === 'pending' && (
                      <>
                        <button onClick={() => handleUpdateStatus(app.id, 'approved')} className="btn btn-primary btn-sm">✅ Approve</button>
                        <button onClick={() => handleUpdateStatus(app.id, 'rejected')} className="btn btn-danger btn-sm">❌ Reject</button>
                      </>
                    )}
                    {app.status !== 'pending' && (
                      <button onClick={() => handleUpdateStatus(app.id, 'pending')} className="btn btn-secondary btn-sm">Reset to Pending</button>
                    )}
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
