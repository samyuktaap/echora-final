import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Calendar, ShieldCheck, CheckCircle2, XCircle, Clock, Zap, Search, Brain, Star } from 'lucide-react';
import { scoreApplications } from '../utils/logisticRegression';

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
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{window.__echoraT?.('matchLabel') || 'Match'}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{percent >= 80 ? (window.__echoraT?.('exceptionalLabel') || 'Exceptional') : percent >= 40 ? (window.__echoraT?.('qualifiedLabel') || 'Qualified') : (window.__echoraT?.('lowMatchLabel') || 'Low Match')}</span>
      </div>
    </div>
  );
};

const NGODashboard = () => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  // Expose t globally for MatchIndicator sub-component
  window.__echoraT = t;
  const [applications, setApplications] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTaskId, setFilterTaskId] = useState('all');
  const [search, setSearch] = useState('');
  const [autoSelectionEnabled, setAutoSelectionEnabled] = useState(false);
  const [autoSelectionThreshold, setAutoSelectionThreshold] = useState(70);
  const [isRunningAutoSelection, setIsRunningAutoSelection] = useState(false);

  // Logistic Regression state
  const [lrPredictions, setLrPredictions] = useState(new Map());
  const [lrModelMeta, setLrModelMeta] = useState(null);

  // Feedback State
  const [feedbackState, setFeedbackState] = useState({});

  useEffect(() => {
    if (!user) return;
    fetchAll();
    fetchAutoSelectionSettings();

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
      const appList = apps || [];
      setApplications(appList);

      // ── Run logistic regression on updated data ─────────────────────────
      try {
        const { modelMeta, predictions } = scoreApplications(appList);
        setLrPredictions(predictions);
        setLrModelMeta(modelMeta);
      } catch (lrErr) {
        console.warn('LR scoring failed:', lrErr);
      }
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAutoSelectionSettings() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('auto_selection_enabled, auto_selection_threshold')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setAutoSelectionEnabled(data.auto_selection_enabled || false);
        setAutoSelectionThreshold(data.auto_selection_threshold || 70);
      }
    } catch (err) {
      console.error('Failed to fetch auto-selection settings:', err);
    }
  }

  const handleAutoSelectionToggle = async () => {
    const newValue = !autoSelectionEnabled;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ auto_selection_enabled: newValue })
        .eq('id', user.id);

      if (error) throw error;
      setAutoSelectionEnabled(newValue);
      toast.success(`Auto-selection ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update auto-selection');
    }
  };

  const handleThresholdChange = async (newThreshold) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ auto_selection_threshold: newThreshold })
        .eq('id', user.id);

      if (error) throw error;
      setAutoSelectionThreshold(newThreshold);
    } catch (err) {
      toast.error('Failed to update threshold');
    }
  };

  const runAutoSelection = async (taskId) => {
    if (!user) return;
    
    setIsRunningAutoSelection(true);
    const toastId = toast.loading('Running auto-selection...');
    
    try {
      // Call the auto-selection function
      const { data, error } = await supabase.rpc('auto_select_applications', {
        task_id_param: taskId,
        ngo_id_param: user.id
      });

      if (error) {
        throw error;
      }

      toast.success('Auto-selection completed successfully! 🎉', { id: toastId });
      
      // Refresh the applications list
      fetchAll();
      
    } catch (err) {
      console.error('Auto-selection error:', err);
      toast.error('Failed to run auto-selection. Please try again.', { id: toastId });
    } finally {
      setIsRunningAutoSelection(false);
    }
  };

  const runAutoSelectionForAllTasks = async () => {
    if (!user) return;
    
    setIsRunningAutoSelection(true);
    const toastId = toast.loading('Running auto-selection for all tasks...');
    
    try {
      // Get all tasks for this NGO
      const { data: tasks, error: tasksError } = await supabase
        .from('ngo_tasks')
        .select('id')
        .eq('ngo_id', user.id);

      if (tasksError) throw tasksError;

      // Run auto-selection for each task
      for (const task of tasks) {
        const { error } = await supabase.rpc('auto_select_applications', {
          task_id_param: task.id,
          ngo_id_param: user.id
        });

        if (error) {
          console.error(`Error in task ${task.id}:`, error);
        }
      }

      toast.success(`Auto-selection completed for ${tasks.length} tasks! 🎉`, { id: toastId });
      
      // Refresh the applications list
      fetchAll();
      
    } catch (err) {
      console.error('Auto-selection error:', err);
      toast.error('Failed to run auto-selection. Please try again.', { id: toastId });
    } finally {
      setIsRunningAutoSelection(false);
    }
  };

  const handleAutoSelect = async (taskId) => {
    const t = toast.loading('Running auto-selection...');
    try {
      console.log('Starting auto-selection for task:', taskId, 'NGO:', user.id);
      
      const { data, error } = await supabase.rpc('auto_select_applications', {
        task_id_param: taskId,
        ngo_id_param: user.id
      });

      console.log('Auto-selection RPC result:', { data, error });

      if (error) {
        console.error('Auto-selection RPC error:', error);
        throw error;
      }
      
      console.log('Auto-selection completed successfully');
      toast.success('Auto-selection completed! 🤖', { id: t });
      fetchAll(); // Refresh applications
    } catch (err) {
      console.error('Auto-selection failed:', err);
      toast.error(`Auto-selection failed: ${err.message}`, { id: t });
    }
  };

  const handleToggleFeedback = (id) => {
    setFeedbackState(prev => ({
      ...prev,
      [id]: { text: '', rating: 5, open: !prev[id]?.open }
    }));
  };

  const handleFeedbackUpdate = (id, field, value) => {
    setFeedbackState(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSubmitFeedback = async (appId, volunteerId) => {
    const data = feedbackState[appId];
    if (!data || !data.text.trim()) return toast.error('Feedback cannot be empty');

    const toastId = toast.loading('Submitting feedback...');
    try {
      // 1. Update application row
      const { error: appErr } = await supabase
        .from('ngo_applications')
        .update({ ngo_feedback: data.text, ngo_rating: data.rating })
        .eq('id', appId);

      if (appErr) throw appErr;

      // 2. Award points (rating * 10)
      const pointsToAward = data.rating * 10;
      const { data: prof, error: fetchProfErr } = await supabase
        .from('profiles')
        .select('points, tasks_completed')
        .eq('id', volunteerId)
        .single();
        
      if (!fetchProfErr && prof) {
         await supabase.from('profiles').update({
           points: (prof.points || 0) + pointsToAward,
           tasks_completed: (prof.tasks_completed || 0) + 1
         }).eq('id', volunteerId);
      }

      // 3. Send notification to the volunteer
      const { data: taskData } = await supabase
        .from('ngo_applications')
        .select('task_title, ngo_name')
        .eq('id', appId)
        .single();

      await supabase.from('notifications').insert({
        user_id: volunteerId,
        type: 'feedback_received',
        title: 'New Feedback & Points! ⭐',
        message: `You received a ${data.rating}-star review for "${taskData?.task_title || 'a recent task'}". You earned ${pointsToAward} points! Review: "${data.text}"`,
        related_id: appId
      });

      setApplications(apps => apps.map(a => a.id === appId ? { ...a, ngo_feedback: data.text, ngo_rating: data.rating } : a));
      handleToggleFeedback(appId); // Close modal
      toast.success('Feedback submitted! Notification sent to volunteer.', { id: toastId });
    } catch(err) {
      console.error(err);
      toast.error('Failed to submit feedback', { id: toastId });
    }
  };

  const handleUpdateStatus = async (id, status) => {
    const t = toast.loading('Updating...');
    try {
      console.log('Updating application:', id, 'to status:', status);
      console.log('Current user:', user?.id, 'Role:', profile?.role);
      
      // Get application details before updating
      const { data: appData, error: fetchError } = await supabase
        .from('ngo_applications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the application status
      const { data, error } = await supabase
        .from('ngo_applications')
        .update({ status })
        .eq('id', id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Send notification to volunteer if approved
      if (status === 'approved' && appData.volunteer_id) {
        console.log('Creating notification for volunteer:', appData.volunteer_id);
        
        const notificationData = {
          user_id: appData.volunteer_id,
          type: 'application_approved',
          title: 'Application Approved by NGO! 🎉',
          message: `Congratulations! Your application for "${appData.task_title}" has been APPROVED by ${appData.ngo_name || 'the NGO'}. The NGO has reviewed and selected you for this opportunity. Please check your email for further details about next steps and contact information.`,
          related_id: appData.id
        };
        
        console.log('Notification data:', notificationData);
        
        const { data: notifData, error: notifError } = await supabase
          .from('notifications')
          .insert(notificationData)
          .select();
          
        console.log('Notification insert result:', { data: notifData, error: notifError });
          
        if (notifError) {
          console.error('Notification error:', notifError);
          toast.error(`Notification failed: ${notifError.message}`);
        } else {
          console.log('Notification sent successfully!');
          toast.success('Notification sent to volunteer! 📧');
        }
      }
      
      toast.success(`Application ${status}`, { id: t });
      setApplications(apps => apps.map(a => a.id === id ? { ...a, status } : a));
    } catch (err) {
      console.error('Update failed error:', err);
      toast.error(`Update failed: ${err.message}`, { id: t });
    }
  };

  const handleToggleTask = async (taskId, active) => {
    await supabase.from('ngo_tasks').update({ active: !active }).eq('id', taskId);
    setMyTasks(t => t.map(x => x.id === taskId ? { ...x, active: !active } : x));
    toast.success(active ? 'Post paused' : 'Post activated');
  };

 const filtered = applications
  .filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterTaskId !== 'all' && a.task_id !== filterTaskId) return false;
    if (search && !a.volunteer_name?.toLowerCase().includes(search.toLowerCase()) && !a.task_title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  })
  .sort((a, b) => b.match_score - a.match_score);
  

  if (profile?.role !== 'ngo' && profile?.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="card" style={{ padding: '5rem 2rem', textAlign: 'center', borderRadius: '24px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
            <Zap size={40} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.75rem' }}>{t('ngoPotalOnly')}</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
            {t('ngoDashboardAccessDesc')} <strong>{profile?.role || 'volunteer'}</strong>.
          </p>
          <button onClick={() => navigate('/tasks')} className="btn btn-primary">{t('goToTaskBoard')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 800 }}>{t('ngoDashboard')}</h1>
          <p className="page-subtitle">{t('postedOpportunities')}</p>
        </div>
        <button onClick={() => navigate('/ngo-form')} className="btn btn-primary">
          {t('postNewOpportunity')}
        </button>
      </div>

      {/* Auto-Selection Controls */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '16px', 
        padding: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {t('autoSelectionMode')}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('autoApproveRejectDesc')}
            </p>
          </div>
          <button
            onClick={handleAutoSelectionToggle}
            style={{
              background: autoSelectionEnabled ? 'var(--gold-grad)' : 'transparent',
              color: autoSelectionEnabled ? '#1a0e05' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: autoSelectionEnabled ? 'var(--gold-mid)' : 'var(--border-color)',
              borderRadius: '20px',
              padding: '0.5rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: autoSelectionEnabled ? '#22c55e' : '#ef4444',
              transition: 'all 0.2s'
            }} />
            {autoSelectionEnabled ? t('enabledLabel') : t('disabledLabel')}
          </button>
        </div>

        {autoSelectionEnabled && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            padding: '1rem',
            background: 'rgba(201,168,76,0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(201,168,76,0.2)'
          }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                {t('compatibilityThreshold')}: {autoSelectionThreshold}%
              </label>
              <input
                type="range"
                min="50"
                max="90"
                value={autoSelectionThreshold}
                onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <span>{t('moreInclusive')}</span>
                <span>{t('verySelective')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {myTasks.filter(task => {
                return applications.some(app => app.task_id === task.id.toString() && app.status === 'pending');
              }).map(task => (
                <button
                  key={task.id}
                  onClick={() => handleAutoSelect(task.id)}
                  className="btn btn-primary"
                  style={{ 
                    padding: '0.5rem 1rem', 
                    fontSize: '0.85rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Auto-Select "{task.title}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* My Posts summary */}
      {myTasks.length > 0 && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{t('yourPosts')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {myTasks.map(task => (
              <div key={task.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 10, padding: '0.4rem 0.75rem', fontSize: '0.82rem',
              }}>
                <span style={{ fontWeight: 600 }}>{task.title}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{ fontSize: 11, color: task.active ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                  {task.active ? t('liveLabel') : t('pausedLabel')}
                </span>
                <button
                  onClick={() => handleToggleTask(task.id, task.active)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                >
                  {task.active ? t('pauseLabel') : t('activateLabel')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[
          { label: t('totalLabel'), val: applications.length, color: 'var(--gold-mid)' },
          { label: t('pendingLabel'), val: applications.filter(a => a.status === 'pending').length, color: '#f59e0b' },
          { label: t('approvedLabel'), val: applications.filter(a => a.status === 'approved').length, color: '#22c55e' },
          { label: t('rejectedLabel'), val: applications.filter(a => a.status === 'rejected').length, color: '#ef4444' },
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
          <input className="form-input" placeholder={t('searchByNameTask')} value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.5rem', height: 40 }} />
        </div>

        {/* Filter by task */}
        {myTasks.length > 1 && (
          <select className="form-select" style={{ height: 40 }} value={filterTaskId} onChange={e => setFilterTaskId(e.target.value)}>
            <option value="all">{t('allPosts')}</option>
            {myTasks.map(t => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
          </select>
        )}

        {/* Auto-selection buttons */}
        <button
          onClick={runAutoSelectionForAllTasks}
          disabled={isRunningAutoSelection}
          style={{
            height: 40,
            padding: '0 1rem',
            background: isRunningAutoSelection ? 'var(--bg-input)' : 'var(--primary-grad)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            cursor: isRunningAutoSelection ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem'
          }}
        >
          {isRunningAutoSelection ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              {t('runningAutoSelectText')}
            </>
          ) : (
            <>
              <Zap size={16} />
              {t('runAutoSelectAllTasks')}
            </>
          )}
        </button>

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
          <p style={{ color: 'var(--text-muted)' }}>{t('loadingApplications')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '5rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📂</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('noApplicationsYet')}</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {myTasks.length === 0 ? t('postOpportunityFirst') : t('volunteersWillAppear')}
          </p>
          {myTasks.length === 0 && (
            <button onClick={() => navigate('/ngo-form')} className="btn btn-primary">{t('postFirstOpportunity')}</button>
          )}
        </div>
      ) : (
        <>
        {/* ── Logistic Regression Model Banner ─────────────────────────── */}
        {lrModelMeta && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: 14, padding: '0.75rem 1.25rem', marginBottom: '1rem',
            flexWrap: 'wrap',
          }}>
            <Brain size={18} style={{ color: 'var(--gold-mid)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold-mid)' }}>
                AI Logistic Regression Model
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                {lrModelMeta.trained
                  ? `Trained on ${applications.filter(a => a.status !== 'pending').length} historical decisions · ${lrModelMeta.accuracy}% training accuracy`
                  : 'Using default weights — approve/reject more applications to improve accuracy'}
              </span>
            </div>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px',
              borderRadius: 20, background: 'rgba(201,168,76,0.12)',
              color: 'var(--gold-mid)', border: '1px solid rgba(201,168,76,0.25)',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>Live Predictions</span>
          </div>
        )}

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
                        {t('applyingFor')} <span style={{ color: 'var(--gold-mid)', fontWeight: 600 }}>{app.task_title}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                      <MatchIndicator percent={app.match_score} />
                      {/* ── AI Recommendation Badge ── */}
                      {(() => {
                        const pred = lrPredictions.get(app.id);
                        if (!pred) return null;
                        return (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: `${pred.color}18`,
                            border: `1px solid ${pred.color}40`,
                            borderRadius: 20, padding: '3px 10px',
                          }}>
                            <Brain size={12} style={{ color: pred.color }} />
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: pred.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              AI: {pred.recommendation}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: pred.color, opacity: 0.8 }}>
                              {pred.pct}%
                            </span>
                          </div>
                        );
                      })()}
                    </div>
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
                            <XCircle size={16} style={{ marginRight: 4 }} /> {t('declineLabel')}
                          </button>
                          <button onClick={() => handleUpdateStatus(app.id, 'approved')} className="btn btn-primary" style={{ height: 40, padding: '0 1.5rem', borderRadius: 10 }}>
                            <CheckCircle2 size={16} style={{ marginRight: 4 }} /> {t('approveLabel')}
                          </button>
                        </>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                          <button onClick={() => handleUpdateStatus(app.id, 'pending')} className="btn btn-secondary" style={{ height: 40, borderRadius: 10 }}>
                            {t('resetToPending')}
                          </button>
                          {app.status === 'approved' && !app.ngo_feedback && (
                            <button onClick={() => handleToggleFeedback(app.id)} className="btn btn-primary" style={{ height: 40, borderRadius: 10, background: 'var(--gold-grad)', color: '#1a0e05', border: 'none' }}>
                              <Star size={16} style={{ marginRight: 4 }} fill="currentColor" /> Give Feedback
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback Section (Submitted) */}
                  {app.ngo_feedback && (
                    <div style={{ background: 'rgba(201,168,76,0.05)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(201,168,76,0.2)', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold-mid)', letterSpacing: '0.1em' }}>Your Feedback</div>
                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} size={14} fill={star <= app.ngo_rating ? 'var(--gold-mid)' : 'transparent'} color={star <= app.ngo_rating ? 'var(--gold-mid)' : 'var(--border-color)'} />
                          ))}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>"{app.ngo_feedback}"</p>
                    </div>
                  )}

                  {/* Feedback UI (Editing) */}
                  {feedbackState[app.id]?.open && !app.ngo_feedback && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 12, border: '1px solid var(--border-color)', marginTop: '1rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Rate Volunteer & Leave Feedback</h4>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        {[1,2,3,4,5].map(star => (
                          <button
                            key={star}
                            onClick={() => handleFeedbackUpdate(app.id, 'rating', star)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <Star size={24} fill={star <= feedbackState[app.id].rating ? 'var(--gold-mid)' : 'transparent'} color={star <= feedbackState[app.id].rating ? 'var(--gold-mid)' : 'var(--border-color)'} style={{ transition: 'all 0.2s' }} />
                          </button>
                        ))}
                      </div>

                      <textarea
                        className="form-input"
                        placeholder="Describe their contribution, attitude, and impact... (this will be public to them)"
                        rows={3}
                        value={feedbackState[app.id].text}
                        onChange={e => handleFeedbackUpdate(app.id, 'text', e.target.value)}
                        style={{ marginBottom: '1rem', resize: 'vertical' }}
                      />

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleToggleFeedback(app.id)} className="btn btn-secondary btn-sm">Cancel</button>
                        <button onClick={() => handleSubmitFeedback(app.id, app.volunteer_id)} className="btn btn-primary btn-sm">Submit Feedback</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
};

export default NGODashboard;
