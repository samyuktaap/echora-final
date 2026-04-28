import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const BannerSlider = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const slides = [
    {
      image: '/slides/dashboard_banner.png',
      title: 'Change the World',
      subtitle: '"Be the catalyst for global impact and lasting transformation."',
      btn1: 'Get Involved',
      btn2: 'View Impact',
      link1: '/tasks',
      link2: '/impact'
    },
    {
      image: '/slides/slide1.png',
      title: 'Education for All',
      subtitle: '"Knowledge is the most powerful weapon which you can use to change the world."',
      btn1: 'Browse Tasks',
      btn2: 'Leaderboard',
      link1: '/tasks',
      link2: '/leaderboard'
    },
    {
      image: '/slides/slide3.png',
      title: 'Protect the Planet',
      subtitle: '"The greatest threat to our planet is the belief that someone else will save it."',
      btn1: 'Find Meetups',
      btn2: 'View Map',
      link1: '/meetups',
      link2: '/map'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div style={{
      position: 'relative',
      height: '340px',
      borderRadius: '32px',
      overflow: 'hidden',
      marginBottom: '2.5rem',
      background: '#0a0a0a',
      boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    }}>
      {/* Background Images */}
      {slides.map((slide, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${slide.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: current === idx ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
            transform: current === idx ? 'scale(1.02)' : 'scale(1)',
            filter: 'brightness(0.6) contrast(1.1)',
          }}
        />
      ))}

      {/* Content Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        padding: '3.5rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        zIndex: 10,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
      }}>
        <div key={current} style={{ animation: 'fadeInUp 0.8s ease-out' }}>
          {/* Logo Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/echora-logo.jpeg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Logo" />
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.15em', color: '#ffffff', opacity: 0.8 }}>ECHORA</span>
          </div>

          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '3.8rem', 
            fontWeight: 800, 
            color: '#ffffff', 
            marginBottom: '1rem',
            lineHeight: 1
          }}>
            {slides[current].title}
          </h1>

          <p style={{ 
            fontSize: '1.15rem', 
            color: 'rgba(255,255,255,0.7)', 
            maxWidth: '500px', 
            marginBottom: '2.5rem',
            fontStyle: 'italic'
          }}>
            {slides[current].subtitle}
          </p>

          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <button 
              onClick={() => navigate(slides[current].link1)}
              style={{ 
                background: '#d8b4fe', // Light Purple
                color: '#1a1a1a',
                padding: '0.9rem 1.8rem',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {slides[current].btn1}
            </button>
            <button 
              onClick={() => navigate(slides[current].link2)}
              style={{ 
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                padding: '0.9rem 1.8rem',
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {slides[current].btn2}
            </button>
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div style={{ position: 'absolute', bottom: '2rem', right: '3rem', display: 'flex', gap: '0.5rem', zIndex: 20 }}>
        {slides.map((_, idx) => (
          <div
            key={idx}
            onClick={() => setCurrent(idx)}
            style={{
              width: current === idx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: current === idx ? '#d8b4fe' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default BannerSlider;
