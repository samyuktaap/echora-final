import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { mockImpactStats } from '../data/mockData';
import { useLanguage } from '../context/LanguageContext';
import { TrendingUp, Users, CheckCircle2, Building2, Map, Clock, Zap, Globe2, ArrowUpRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#ef4444', '#c9a84c', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
        <p style={{ fontWeight: 800, color: 'white', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{label}</p>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>{p.name}:</span>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>{p.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const ImpactDashboard = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  // Translate graph data arrays dynamically
  const translatedMonthlyGrowth = mockImpactStats.monthlyGrowth.map(item => ({
    ...item,
    month: t(item.month)
  }));

  const translatedSkillDistribution = mockImpactStats.skillDistribution.map(item => ({
    ...item,
    skill: t(item.skill)
  }));

  const statCards = [
    { icon: <Users size={24} />, label: t('activeVolunteers'), value: mockImpactStats.totalVolunteers.toLocaleString(), color: '#3b82f6', trend: '+12% this month' },
    { icon: <CheckCircle2 size={24} />, label: t('tasksDelivered'), value: mockImpactStats.tasksCompleted.toLocaleString(), color: '#22c55e', trend: '+24% this month' },
    { icon: <Building2 size={24} />, label: t('partnerNGOs'), value: mockImpactStats.ngosSupported, color: '#c9a84c', trend: '+7 new partners' },
    { icon: <Globe2 size={24} />, label: t('reachCities'), value: mockImpactStats.citiesCovered, color: '#f59e0b', trend: 'Pan-India Presence' },
  ];

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <TrendingUp style={{ color: 'var(--gold-mid)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--gold-mid)', letterSpacing: '0.1em' }}>{t('networkAnalytics')}</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '3rem', fontWeight: 800, wordBreak: 'break-word' }}>{t('impactCommandCenter')}</h1>
          <p className="page-subtitle" style={{ fontSize: '1.2rem' }}>{t('measuringRealWorldChange')}</p>
        </div>
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', gap: '1.5rem' }}>
           <div>
             <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('totalHours')}</div>
             <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>18,540</div>
           </div>
           <div style={{ width: '1px', background: 'var(--border-color)' }} />
           <div>
             <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('impactValue')}</div>
             <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--gold-mid)' }}>$277.5K</div>
           </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {statCards.map(s => (
          <div key={s.label} className="card card-hover" style={{ 
            borderRadius: '24px', padding: '1.75rem', border: '1px solid var(--border-color)', 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: `radial-gradient(circle, ${s.color}15 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ width: 48, height: 48, borderRadius: '14px', background: `${s.color}18`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {s.icon}
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: '0.5rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem' }}>{s.label}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: s.color, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Zap size={14} /> {s.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Control */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        {[{ key: 'overview', label: t('overview') }, { key: 'growth', label: t('growth') }, { key: 'skills', label: t('skills') }, { key: 'hours', label: t('hours') }].map(({ key, label }) => (
          <button key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              color: activeTab === key ? '#1a0e05' : 'var(--text-secondary)',
              background: activeTab === key ? 'var(--gold-grad)' : 'transparent',
              textTransform: 'capitalize'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dynamic Content Area */}
      <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '32px', border: '1px solid var(--border-color)', padding: '2.5rem', backdropFilter: 'blur(10px)' }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2.5rem' }}>
            {/* Monthly Trend Area Chart */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('activityGrowth')}</h3>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('latest6Months')}</div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={translatedMonthlyGrowth}>
                  <defs>
                    <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTask" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '0.8rem', fontWeight: 600 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '0.8rem', fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="volunteers" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" name={t('volunteers')} />
                  <Area type="monotone" dataKey="tasks" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorTask)" name={t('tasks')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Skills Radar-like Bar Chart */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('skillDistribution')}</h3>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('topCategories')}</div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={translatedSkillDistribution} layout="vertical" margin={{ left: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="skill" type="category" stroke="white" style={{ fontSize: '0.85rem', fontWeight: 700 }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                  <Bar dataKey="count" fill="var(--gold-mid)" radius={[0, 10, 10, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '4rem', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie data={translatedSkillDistribution} cx="50%" cy="50%" innerRadius={80} outerRadius={140} paddingAngle={5} dataKey="count">
                    {translatedSkillDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900 }}>100%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>{t('diversified')}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {translatedSkillDistribution.map((s, i) => (
                <div key={s.skill} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                    <span style={{ fontSize: '1rem', fontWeight: 800 }}>{s.skill}</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginBottom: '0.25rem' }}>{s.count}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('qualifiedVolunteers')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tabs can be expanded similarly with high-fidelity visuals */}
        {activeTab === 'growth' && (
           <div style={{ textAlign: 'center', padding: '5rem' }}>
             <Zap size={48} style={{ color: 'var(--gold-mid)', marginBottom: '1.5rem' }} />
             <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('growthInsightActive')}</h3>
             <p style={{ color: 'var(--text-muted)' }}>{t('growthInsightDesc')}</p>
           </div>
        )}
        
        {activeTab === 'hours' && (
           <div style={{ textAlign: 'center', padding: '5rem' }}>
             <Clock size={48} style={{ color: '#3b82f6', marginBottom: '1.5rem' }} />
             <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('timeContributionMatrix')}</h3>
             <p style={{ color: 'var(--text-muted)' }}>{t('timeContributionDesc')}</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default ImpactDashboard;
