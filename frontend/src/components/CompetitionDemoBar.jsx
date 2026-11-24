import React from 'react';
import { Play, Zap, AlertTriangle, Users, Bus, RefreshCw, Radio } from 'lucide-react';

export default function CompetitionDemoBar({
  activeScenario,
  speed,
  onSelectScenario,
  onChangeSpeed,
  simulated
}) {
  const scenarios = [
    { id: 'normal', label: '1. Normal Loop', icon: Play, desc: '2 shuttles on 5-stop campus loop' },
    { id: 'crowd_spike', label: '2. Crowd Spike (95 vs 80)', icon: Users, desc: '95 waiting at Hostel -> 15 shortfall' },
    { id: 'stale_gps', label: '3. Stale GPS (>30s)', icon: AlertTriangle, desc: 'Tests FR-04: warns, never shows fake live' },
    { id: 'full_bus', label: '4. Full Bus + Alternative', icon: Bus, desc: '100% full -> offers next alternative' },
    { id: 'no_spare_bus', label: '5. Zero Spare Bus', icon: AlertTriangle, desc: 'Tests T07: unmet demand, no fake dispatch' },
    { id: 'reset', label: 'Reset Demo', icon: RefreshCw, desc: 'Reset to clean state' }
  ];

  return (
    <div className="demo-banner">
      <div className="demo-badge-wrap">
        <span className="simulated-pill">Simulated Mode</span>
        <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
          Judge Presentation Controls (SRS Sec. 14):
        </span>
      </div>

      <div className="scenario-buttons">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          return (
            <button
              key={sc.id}
              className={`scenario-btn ${activeScenario === sc.id ? 'active' : ''}`}
              onClick={() => onSelectScenario(sc.id)}
              title={sc.desc}
            >
              <Icon size={13} />
              <span>{sc.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>Speed:</span>
        <div className="speed-toggle">
          {[1.0, 2.0, 5.0].map((s) => (
            <button
              key={s}
              className={`speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => onChangeSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
