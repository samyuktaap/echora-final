import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import toast from 'react-hot-toast';

const Login = () => {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [role, setRole] = useState('volunteer');
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);

  const accentColor = '#a7c080'; // The green from the image

  const slides = [
    {
      image: '/slides/slide1.png',
      quote: '"The best way to find yourself is to lose yourself in the service of others."',
      author: 'MAHATMA GANDHI',
    },
    {
      image: '/slides/slide2.png',
      quote: '"We make a living by what we get, but we make a life by what we give."',
      author: 'WINSTON CHURCHILL',
    },
    {
      image: '/slides/slide3.png',
      quote: '"Volunteers don\'t get paid, not because they\'re worthless, but because they\'re priceless."',
      author: 'VOLUNTEER MOTTO',
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (form.password !== form.confirmPassword) {
          toast.error(t('passwordsNotMatch'));
          setLoading(false);
          return;
        }
        const result = await signUpWithEmail(form.email, form.password, form.name, role);
        if (result.success) {
          if (result.needsConfirmation) {
            toast.success(t('accountCreatedVerify'), { duration: 6000 });
            setMode('signin');
          } else {
            toast.success(t('welcomeToEchora'));
            navigate('/dashboard');
          }
        } else {
          toast.error(result.error);
        }
      } else {
        const result = await signInWithEmail(form.email, form.password);
        if (result.success) {
          toast.success(t('welcomeBack'));
          navigate('/dashboard');
        } else {
          toast.error(result.error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (type) => {
    setLoading(true);
    const email = type === 'volunteer' ? 'sam@gmail.com' : 'ngo@demo.com';
    const password = 'password123';
    try {
      const result = await signInWithEmail(email, password);
      if (result.success) {
        toast.success(`Welcome to ${type} demo!`);
        navigate('/dashboard');
      } else {
        toast.error('Demo login failed. Please try manual login.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1.2fr 1fr',
      background: '#0a0a0a',
      color: '#ffffff',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* LEFT: Hero Slider */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Images */}
        {slides.map((slide, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: currentSlide === idx ? 1 : 0,
              transition: 'opacity 1.2s ease-in-out',
              zIndex: 0,
            }}
          />
        ))}

        {/* Navigation Arrows */}
        <div style={{ position: 'absolute', top: '50%', left: '2rem', zIndex: 10, transform: 'translateY(-50%)' }}>
          <button 
            onClick={() => setCurrentSlide(p => (p - 1 + slides.length) % slides.length)}
            style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}
          >
            ←
          </button>
        </div>
        <div style={{ position: 'absolute', top: '50%', right: '2rem', zIndex: 10, transform: 'translateY(-50%)' }}>
          <button 
            onClick={() => setCurrentSlide(p => (p + 1) % slides.length)}
            style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}
          >
            →
          </button>
        </div>

        {/* Quote Card */}
        <div style={{
          position: 'absolute',
          bottom: '3rem',
          left: '3rem',
          right: '3rem',
          zIndex: 10,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(30px)',
          padding: '3rem',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '600px',
        }}>
          <div key={currentSlide} style={{ animation: 'fadeInUp 0.8s ease-out' }}>
            <p style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '2.5rem', 
              fontWeight: 700, 
              lineHeight: 1.2, 
              marginBottom: '1.5rem',
              color: '#ffffff'
            }}>
              {slides[currentSlide].quote}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 20, height: 2, background: accentColor }} />
              <p style={{ fontSize: '0.85rem', letterSpacing: '0.15em', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                {slides[currentSlide].author}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Auth Form */}
      <div style={{ 
        padding: '4rem 5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        background: '#050505',
        position: 'relative',
        overflowY: 'auto'
      }}>
        {/* Top bar with Branding & Controls */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '6rem' 
        }}>
          {/* Header Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/echora-logo.svg" style={{ width: 32, height: 32 }} alt="Logo" />
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>ECHORA</div>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', opacity: 0.5 }}>EMPATHY IN EVERY ECHO</div>
            </div>
          </div>

          {/* Language & Theme Controls */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <LanguageSwitcher />
            <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
            {mode === 'signin' ? 'Login' : 'Join'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
            {mode === 'signin' ? (
              <>Sign up here if you do not have an account. <span onClick={() => setMode('signup')} style={{ color: accentColor, fontWeight: 700, cursor: 'pointer' }}>Sign Up</span></>
            ) : (
              <>Already have an account? <span onClick={() => setMode('signin')} style={{ color: accentColor, fontWeight: 700, cursor: 'pointer' }}>Login</span></>
            )}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {mode === 'signup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 600, opacity: 0.4 }}>FULL NAME</label>
                <input 
                  value={form.name} onChange={set('name')}
                  style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0', color: 'white', outline: 'none', fontSize: '1rem' }}
                  placeholder="John Doe"
                />
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 600, opacity: 0.4 }}>EMAIL</label>
              <input 
                type="email" value={form.email} onChange={set('email')}
                style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0', color: 'white', outline: 'none', fontSize: '1rem' }}
                placeholder="sam@gmail.com"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 600, opacity: 0.4 }}>PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0', color: 'white', outline: 'none', fontSize: '1rem' }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                  {showPass ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.7rem', letterSpacing: '0.15em', fontWeight: 600, opacity: 0.4 }}>CONFIRM PASSWORD</label>
                <input 
                  type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
                  style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0', color: 'white', outline: 'none', fontSize: '1rem' }}
                  placeholder="••••••••"
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifySpace: 'between', marginTop: '-0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', opacity: 0.4, cursor: 'pointer', flex: 1 }}>
                <input type="checkbox" style={{ accentColor }} />
                Remember me
              </label>
              <Link to="#" style={{ fontSize: '0.85rem', fontWeight: 600, color: accentColor }}>Forgot password?</Link>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                marginTop: '1rem',
                background: accentColor, 
                color: '#1a1a1a', 
                border: 'none', 
                padding: '1.25rem', 
                borderRadius: '50px', 
                fontWeight: 800, 
                fontSize: '0.9rem', 
                letterSpacing: '0.1em', 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? 'PROCESSING...' : mode === 'signin' ? 'LOGIN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div style={{ marginTop: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', fontWeight: 700, opacity: 0.3 }}>QUICK DEMO ACCESS</div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => handleDemoLogin('volunteer')}
                style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                VOLUNTEER DEMO
              </button>
              <button 
                onClick={() => handleDemoLogin('ngo')}
                style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', padding: '1rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                NGO DEMO
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns: 1.2fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="position: relative; overflow: hidden"] { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;
