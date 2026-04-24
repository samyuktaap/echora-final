import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { SKILLS_LIST, LANGUAGES_LIST, INDIA_STATES } from '../data/mockData';

const VolunteerSignup = () => {
  const { signUpWithEmail, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    state: '',
    experience: 'Beginner',
    skills: [],
    languages: [],
    bio: '',
  });
  const [showPass, setShowPass] = useState(false);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));
  const toggleSkill = (s) => setForm(p => ({ ...p, skills: p.skills.includes(s) ? p.skills.filter(x => x !== s) : [...p.skills, s] }));
  const toggleLang = (l) => setForm(p => ({ ...p, languages: p.languages.includes(l) ? p.languages.filter(x => x !== l) : [...p.languages, l] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!form.name || !form.email || !form.password) {
        toast.error('Fill in all fields');
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (form.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      setStep(2);
    } else {
      setLoading(true);
      try {
        const result = await signUpWithEmail(form.email, form.password, form.name, 'volunteer');
        if (result.success) {
          if (result.needsConfirmation) {
            toast.success('Account created! Please check your email to verify before continuing.', { duration: 8000 });
            navigate('/login');
          } else {
            // Update profile with additional info
            await updateProfile({
              location: form.location,
              state: form.state,
              experience: form.experience,
              skills: form.skills,
              languages: form.languages,
              bio: form.bio
            });
            toast.success('Welcome to ECHORA! 🎉');
            navigate('/volunteer-onboarding');
          }
        } else {
          toast.error(result.error);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '12px',
              background: 'var(--gold-grad)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', boxShadow: 'var(--shadow-gold)',
            }}>⚡</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold-light)', letterSpacing: '-0.01em' }}>ECHORA</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>Volunteer Network</div>
            </div>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.35rem', fontFamily: 'var(--font-display)' }}>Join the Movement</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Step {step} of 2 • Create your volunteer profile</p>
        </div>

        <div className="card card-gold">
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Step 1: Account */}
              {step === 1 && (
                <>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Create Your Account</h2>
                  
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" placeholder="Aarav Sharma" value={form.name} onChange={set('name')} autoFocus />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={set('password')} style={{ paddingRight: '3rem' }} />
                      <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem' }}>
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm Password *</label>
                    <input className="form-input" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} />
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: '0.5rem' }}>Continue → </button>
                </>
              )}

              {/* Step 2: Profile */}
              {step === 2 && (
                <>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Complete Your Profile</h2>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input className="form-input" placeholder="Mumbai" value={form.location} onChange={set('location')} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <select className="form-select" value={form.state} onChange={set('state')}>
                        <option value="">Select State</option>
                        {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bio</label>
                    <textarea className="form-textarea" placeholder="Tell us about yourself…" value={form.bio} onChange={set('bio')} style={{ minHeight: 70 }} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Experience Level</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['Beginner', 'Intermediate', 'Expert'].map(lvl => (
                        <button key={lvl} type="button" onClick={() => setForm(p => ({ ...p, experience: lvl }))} style={{
                          flex: 1, padding: '0.5rem', borderRadius: '10px', border: '1.5px solid',
                          borderColor: form.experience === lvl ? 'var(--gold-mid)' : 'var(--border-color)',
                          background: form.experience === lvl ? 'rgba(201,168,76,0.1)' : 'var(--bg-input)',
                          color: form.experience === lvl ? 'var(--gold-light)' : 'var(--text-secondary)',
                          cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.15s',
                        }}>{lvl}</button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Skills <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></label>
                    <div className="chip-group">
                      {SKILLS_LIST.map(s => <div key={s} className={`chip ${form.skills.includes(s) ? 'selected' : ''}`} onClick={() => toggleSkill(s)}>{s}</div>)}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Languages <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></label>
                    <div className="chip-group">
                      {LANGUAGES_LIST.map(l => <div key={l} className={`chip ${form.languages.includes(l) ? 'selected' : ''}`} onClick={() => toggleLang(l)}>{l}</div>)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button type="button" onClick={() => setStep(1)} className="btn btn-secondary btn-lg" style={{ flex: 1 }}>← Back</button>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                      {loading ? <><span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Creating...</> : 'Create Account'}
                    </button>
                  </div>
                </>
              )}
            </form>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Already have an account? <a href="/login" style={{ color: 'var(--gold-mid)', fontWeight: 600, textDecoration: 'none' }}>Sign in →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerSignup;
