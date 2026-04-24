import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mockVolunteers, mockNGORequests, INDIA_STATES } from '../data/mockData';
import { useAuth, STATE_COORDS } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const mkIcon = (bg, emoji) => L.divIcon({
  html: `<div style="background:${bg};width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid rgba(255,255,255,0.9);box-shadow:0 3px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:13px;display:block;text-align:center;margin-top:2px">${emoji}</span></div>`,
  iconSize: [34,34], iconAnchor: [17,34], popupAnchor: [0,-36], className: '',
});

const volunteerIcon = mkIcon('#2a4a9b','🙋');
const ngoIcon = mkIcon('#9b2335','🏢');
const userIcon = mkIcon('#c9a84c','⭐');

const FlyTo = ({ coords, zoom = 8 }) => {
  const map = useMap();
  useEffect(() => { if (coords) map.flyTo([coords.lat, coords.lng], zoom, { duration: 1.5 }); }, [coords, map, zoom]);
  return null;
};

const MapView = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [showNGOs, setShowNGOs] = useState(true);
  const [showHeat, setShowHeat] = useState(true);
  const [filterState, setFilterState] = useState('');
  const [flyTarget, setFlyTarget] = useState(null);

  // Derive user coords from profile (auto-updated when profile.location changes)
  const userCoords = profile?.lat && profile?.lng && !(profile.lat === 20.5937 && profile.lng === 78.9629)
    ? { lat: profile.lat, lng: profile.lng }
    : profile?.state && STATE_COORDS[profile.state]
    ? STATE_COORDS[profile.state]
    : null;

  const filtered_v = mockVolunteers.filter(v => !filterState || v.state === filterState);
  const filtered_n = mockNGORequests.filter(r => !filterState || r.state === filterState);

  const nearestTask = userCoords
    ? filtered_n.reduce((best, t) => {
        const d = Math.hypot(t.lat - userCoords.lat, t.lng - userCoords.lng);
        return !best || d < best.d ? { ...t, d } : best;
      }, null)
    : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">{t('pageMap')}</h1>
        <p className="page-subtitle">
          {t('greetingEvening')} · {t('appTagline')}
          {profile?.location && <span style={{ color: 'var(--gold-mid)' }}> · {t('mapShowingYourLocation')}: {profile.location}</span>}
        </p>
      </div>

      {/* Location notice */}
      {!userCoords && (
        <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          💡 <strong style={{ color: 'var(--gold-mid)' }}>{t('info')}:</strong> {t('mapTip')}
        </div>
      )}

      {/* Nearest task banner */}
      {nearestTask && (
        <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.3rem' }}>📍</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--gold-mid)', fontSize: '0.85rem' }}>{t('mapNearestTask')}</strong>
            <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
              {nearestTask.ngoName} — {nearestTask.location}, {nearestTask.state}
            </span>
          </div>
          <span className={`badge urgency-${nearestTask.urgency.toLowerCase()}`}>{t(`urgency${nearestTask.urgency}`)}</span>
          <button onClick={() => setFlyTarget({ lat: nearestTask.lat, lng: nearestTask.lng, zoom: 10 })} className="btn btn-secondary btn-sm">{t('mapFlyTo')} →</button>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { label: `🙋 ${t('mapVolunteers')}`, val: showVolunteers, set: setShowVolunteers, color: '#4a72d4' },
          { label: `🏢 ${t('mapNGOTasks')}`, val: showNGOs, set: setShowNGOs, color: '#c94060' },
          { label: `🌡️ ${t('mapHeatmap')}`, val: showHeat, set: setShowHeat, color: 'var(--gold-mid)' },
        ].map(c => (
          <button key={c.label} onClick={() => c.set(p => !p)} style={{
            padding: '0.4rem 0.9rem', borderRadius: '20px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            border: `1.5px solid ${c.val ? c.color : 'var(--border-color)'}`,
            background: c.val ? `${c.color}18` : 'var(--bg-input)',
            color: c.val ? c.color : 'var(--text-muted)', transition: 'all 0.15s',
          }}>{c.label}</button>
        ))}
        <select className="form-select" value={filterState} onChange={e => setFilterState(e.target.value)} style={{ maxWidth: 200, fontSize: '0.82rem' }}>
          <option value="">{t('mapAllStates')}</option>
          {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {userCoords && (
          <button onClick={() => setFlyTarget({ ...userCoords, zoom: 9 })} className="btn btn-primary btn-sm">📍 {t('mapMyLocation')}</button>
        )}
        <span className="badge badge-gray" style={{ marginLeft: 'auto' }}>{filtered_v.length} {t('volunteers')} · {filtered_n.length} {t('navTasks')}</span>
      </div>

      {/* Map */}
      <div className="card" style={{ overflow: 'hidden', height: 580 }}>
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {flyTarget && <FlyTo coords={flyTarget} zoom={flyTarget.zoom} />}

          {/* Heatmap */}
          {showHeat && INDIA_STATES.map(state => {
            const c = STATE_COORDS[state];
            if (!c) return null;
            const density = mockVolunteers.filter(v => v.state === state).length + mockNGORequests.filter(r => r.state === state).length * 2;
            if (!density) return null;
            return (
              <Circle key={state} center={[c.lat, c.lng]} radius={density * 38000}
                pathOptions={{ color: '#c9a84c', fillColor: '#c9a84c', fillOpacity: 0.1, weight: 1 }}>
                <Popup><div style={{ minWidth: 160, fontFamily: 'DM Sans, sans-serif', color: '#e8dfc8' }}>
                  <strong>{state}</strong><br />
                  🙋 {mockVolunteers.filter(v => v.state === state).length} {t('volunteers')}<br />
                  🏢 {mockNGORequests.filter(r => r.state === state).length} {t('navTasks')}
                </div></Popup>
              </Circle>
            );
          })}

          {/* Volunteers */}
          {showVolunteers && filtered_v.map(v => (
            <Marker key={`v${v.id}`} position={[v.lat, v.lng]} icon={volunteerIcon}>
              <Popup><div style={{ minWidth: 190, fontFamily: 'DM Sans, sans-serif', color: '#e8dfc8' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{v.name}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.7, marginBottom: '0.25rem' }}>📍 {v.location}, {v.state}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.7, marginBottom: '0.4rem' }}>🏅 {t(v.experience.toLowerCase())} · {v.points} {t('pts')}</div>
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                  {v.skills.map(s => <span key={s} style={{ background: 'rgba(42,74,155,0.3)', color: '#7aa2e8', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '20px' }}>{s}</span>)}
                </div>
              </div></Popup>
            </Marker>
          ))}

          {/* NGO Tasks */}
          {showNGOs && filtered_n.map(r => (
            <Marker key={`n${r.id}`} position={[r.lat, r.lng]} icon={ngoIcon}>
              <Popup><div style={{ minWidth: 210, fontFamily: 'DM Sans, sans-serif', color: '#e8dfc8' }}>
                <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{r.ngoName}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.7, marginBottom: '0.25rem' }}>📍 {r.location}, {r.state}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.75, marginBottom: '0.5rem', lineHeight: 1.5 }}>{r.taskDescription}</div>
                <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '20px', fontWeight: 600, background: r.urgency==='High'?'rgba(155,35,53,0.3)':r.urgency==='Medium'?'rgba(201,168,76,0.2)':'rgba(45,158,106,0.2)', color: r.urgency==='High'?'#e06080':r.urgency==='Medium'?'#c9a84c':'#5dba8c' }}>{t(`urgency${r.urgency}`)} {t('info')}</span>
              </div></Popup>
            </Marker>
          ))}

          {/* User marker */}
          {userCoords && (
            <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon}>
              <Popup><div style={{ fontFamily: 'DM Sans, sans-serif', color: '#e8dfc8' }}>
                <strong>📍 {t('yourLocation')}</strong><br />
                <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>{profile?.location || ''}{profile?.state ? `, ${profile.state}` : ''}</span>
              </div></Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('mapLegend')}</span>
            {[
              ['#4a72d4','🙋',t('mapVolunteers')],
              ['#c94060','🏢',t('mapNGOTasks')],
              ['var(--gold-mid)','⭐',t('yourLocation')],
              ['var(--gold-mid)','🌡️',t('mapHeatmap')]
            ].map(([c,i,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{i} {l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
