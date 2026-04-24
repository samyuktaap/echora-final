import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { SKILLS_LIST, INDIA_STATES } from '../data/mockData';

const CAUSES = ['Education', 'Healthcare', 'Technology', 'Community', 'Environment', 'Animal Welfare', 'Women Empowerment'];

const NGOForm = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    cause: '',
    location: '',
    state: '',
    required_skills: [],
    min_experience: 'Beginner',
    availability: 'Flexible',
    urgency: 'medium',
    spots: 1,
    deadline: '',
    additional_info: '',
  });

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const toggleSkill = (s) => setForm(p => ({
    ...p,
    required_skills: p.required_skills.includes(s)
      ? p.required_skills.filter(x => x !== s)
      : [...p.required_skills, s],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.location || !form.description) {
      toast.error('Fill in all required fields');
      return;
    }
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('ngo_tasks').insert({
        ngo_id: user.id,
        ngo_name: profile?.name || 'Unknown NGO',
        title: form.title,
        description: form.description,
        cause: form.cause,
        location: form.location,
        state: form.state,
        required_skills: form.required_skills,
        min_experience: form.min_experience,
        availability: form.availability,
        urgency: form.urgency,
        spots: Number(form.spots),
        deadline: form.deadline,
        active: true,
      });

      if (error) throw error;

      toast.success('Volunteer opportunity posted! Volunteers can now apply.');
      navigate('/ngo-dashboard');
    } catch (err) {
      console.error(err);
      toast.error('Failed to post: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inp = 'form-input';
  const sel = 'form-select';

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Post a Volunteer Opportunity</h1>
        <p className="page-subtitle">Volunteers will see this and apply directly to you</p>
      </div>

      <div className="card card-gold" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Role title */}
            <div className="form-group">
              <label className="form-label">Role / Title *</label>
              <input className={inp} placeholder="e.g. English Teaching Assistant" value={form.title} onChange={set('title')} required />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" placeholder="What will volunteers do? What impact will they make?" value={form.description} onChange={set('description')} required style={{ minHeight: 100 }} />
            </div>

            <div className="grid-2">
              {/* Cause */}
              <div className="form-group">
                <label className="form-label">Cause</label>
                <select className={sel} value={form.cause} onChange={set('cause')}>
                  <option value="">Select cause</option>
                  {CAUSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {/* Urgency */}
              <div className="form-group">
                <label className="form-label">Urgency</label>
                <select className={sel} value={form.urgency} onChange={set('urgency')}>
                  <option value="high">🔴 High — Immediate need</option>
                  <option value="medium">🟡 Medium — Within a month</option>
                  <option value="low">🟢 Low — Open-ended</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              {/* Location */}
              <div className="form-group">
                <label className="form-label">City *</label>
                <input className={inp} placeholder="e.g. Mumbai" value={form.location} onChange={set('location')} required />
              </div>
              {/* State */}
              <div className="form-group">
                <label className="form-label">State</label>
                <select className={sel} value={form.state} onChange={set('state')}>
                  <option value="">Select State</option>
                  {INDIA_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid-2">
              {/* Availability */}
              <div className="form-group">
                <label className="form-label">Availability Required</label>
                <select className={sel} value={form.availability} onChange={set('availability')}>
                  <option value="Weekdays">Weekdays</option>
                  <option value="Weekends">Weekends</option>
                  <option value="Flexible">Flexible</option>
                  <option value="Full-time">Full-time</option>
                </select>
              </div>
              {/* Min experience */}
              <div className="form-group">
                <label className="form-label">Min. Experience</label>
                <select className={sel} value={form.min_experience} onChange={set('min_experience')}>
                  <option value="Beginner">Any (Beginner OK)</option>
                  <option value="Intermediate">Intermediate (1–2 yrs)</option>
                  <option value="Expert">Expert (3+ yrs)</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              {/* Spots */}
              <div className="form-group">
                <label className="form-label">Spots Available</label>
                <input className={inp} type="number" min={1} value={form.spots} onChange={set('spots')} />
              </div>
              {/* Deadline */}
              <div className="form-group">
                <label className="form-label">Application Deadline</label>
                <input className={inp} type="date" value={form.deadline} onChange={set('deadline')} />
              </div>
            </div>

            {/* Skills */}
            <div className="form-group">
              <label className="form-label">Required Skills</label>
              <div className="chip-group">
                {SKILLS_LIST.map(s => (
                  <div
                    key={s}
                    className={`chip ${form.required_skills.includes(s) ? 'selected' : ''}`}
                    onClick={() => toggleSkill(s)}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional info */}
            <div className="form-group">
              <label className="form-label">Additional Information</label>
              <textarea className="form-textarea" placeholder="Anything else volunteers should know?" value={form.additional_info} onChange={set('additional_info')} style={{ minHeight: 80 }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/ngo-dashboard')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting
                  ? <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Posting...</>
                  : '→ Post Opportunity'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NGOForm;
