import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, ArrowRight, Award, Shield, Zap } from 'lucide-react';

const VolunteerOnboarding = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const steps = [
    {
      title: "Verify Your Profile",
      desc: "Complete your skills and location settings to get matched with the right NGOs.",
      icon: <Shield className="text-blue-400" size={24} />,
      status: "completed"
    },
    {
      title: "Explore Opportunities",
      desc: "Use the map view to find verified volunteering tasks in your local area.",
      icon: <Zap className="text-yellow-400" size={24} />,
      status: "pending"
    },
    {
      title: "Earn Impact Points",
      desc: "Get badges and level up your volunteer tier by completing tasks.",
      icon: <Award className="text-purple-400" size={24} />,
      status: "pending"
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        background: 'var(--bg-secondary)',
        borderRadius: '24px',
        padding: '3rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid var(--border-color)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Background Element */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          right: '-100px',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(201, 168, 76, 0.1) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 800, 
            marginBottom: '1rem',
            fontFamily: 'var(--font-display)',
            background: 'var(--gold-grad)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Welcome to the Network, {profile?.name?.split(' ')[0] || 'Volunteer'}!
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '1.1rem', 
            marginBottom: '3rem',
            lineHeight: 1.6
          }}>
            You're now part of ECHORA. Let's get you set up to start making a real impact across India.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
            {steps.map((step, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'transform 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(10px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {step.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{step.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{step.desc}</p>
                </div>
                {step.status === 'completed' && <CheckCircle size={20} className="text-green-500" />}
              </div>
            ))}
          </div>

          <button 
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              fontSize: '1.1rem',
              fontWeight: 700,
              padding: '1.25rem'
            }}
          >
            Enter Dashboard <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <style>{`
        .text-blue-400 { color: #60a5fa; }
        .text-yellow-400 { color: #fbbf24; }
        .text-purple-400 { color: #c084fc; }
        .text-green-500 { color: #22c55e; }
      `}</style>
    </div>
  );
};

export default VolunteerOnboarding;
