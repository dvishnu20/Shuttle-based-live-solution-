import React, { useState, useRef, useEffect } from 'react';
import {
  Bus, User, Gauge, LogOut, ChevronDown, Check, Sparkles, Play, Users,
  AlertTriangle, RefreshCw, Radio, Shield
} from 'lucide-react';

export default function Navbar({
  currentUser,
  activeRole,
  onChangeRole,
  onLogout,
  wsConnected,
  activeScenario = 'normal',
  onSelectScenario,
  speed = 1.0,
  onChangeSpeed
}) {
  const [scenarioMenuOpen, setScenarioMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const scenarios = [
    { id: 'normal', label: '1. Normal Loop', detail: '2 shuttles on 5-stop loop', icon: Play, color: '#059669' },
    { id: 'crowd_spike', label: '2. Crowd Spike (95 vs 80)', detail: '95 waiting at Hostel → 15 shortfall', icon: Users, color: '#d97706' },
    { id: 'stale_gps', label: '3. Stale GPS (>30s)', detail: 'Tests GPS warning banner', icon: AlertTriangle, color: '#db2777' },
    { id: 'full_bus', label: '4. Full Bus + Alternative', detail: '100% full → alternative shuttle', icon: Bus, color: '#dc2626' },
    { id: 'no_spare_bus', label: '5. Zero Spare Bus', detail: 'Unmet demand, no fake dispatch', icon: AlertTriangle, color: '#ea580c' },
    { id: 'reset', label: 'Reset Clean State', detail: 'Restore all default parameters', icon: RefreshCw, color: '#2563eb' }
  ];

  const currentScenarioObj = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const CurrentScenarioIcon = currentScenarioObj.icon;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setScenarioMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="light-navbar">
      {/* 1. Brand Section */}
      <div className="brand-section">
        <div className="brand-icon-wrap">
          <Bus size={20} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="brand-logo-text">CampusMove AI</span>
            <span className="campus-badge">VIT VELLORE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: wsConnected ? '#10b981' : '#f59e0b',
                display: 'inline-block'
              }}
            />
            <span style={{ fontSize: '0.68rem', color: wsConnected ? '#059669' : '#d97706', fontWeight: 700 }}>
              {wsConnected ? 'Live Grid Active' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Two Portal Tabs (Student & Driver) */}
      <nav className="portal-switch-tabs">
        <button
          className={`portal-tab-btn ${activeRole === 'student' ? 'active' : ''}`}
          onClick={() => onChangeRole('student')}
        >
          <User size={15} />
          <span>Student Portal</span>
        </button>

        <button
          className={`portal-tab-btn ${activeRole === 'driver' ? 'active' : ''}`}
          onClick={() => onChangeRole('driver')}
        >
          <Gauge size={15} />
          <span>Driver Terminal</span>
        </button>
      </nav>

      {/* 3. Right: Simulation Scenario + User Profile + Logout */}
      <div className="nav-right-controls" ref={dropdownRef}>
        {/* Simulation Scenario Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="scenario-btn-light"
            onClick={() => setScenarioMenuOpen(!scenarioMenuOpen)}
            title="Switch Demo Scenario"
          >
            <CurrentScenarioIcon size={14} style={{ color: currentScenarioObj.color }} />
            <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
              <div style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Scenario
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {currentScenarioObj.label}
              </div>
            </div>
            <ChevronDown size={13} color="#64748b" />
          </button>

          {scenarioMenuOpen && (
            <div className="scenario-menu-light">
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                Presentation Demo Scenarios
              </div>
              {scenarios.map((sc) => {
                const Icon = sc.icon;
                const isCurrent = activeScenario === sc.id;
                return (
                  <button
                    key={sc.id}
                    className={`scenario-item-light ${isCurrent ? 'selected' : ''}`}
                    onClick={() => {
                      if (onSelectScenario) onSelectScenario(sc.id);
                      setScenarioMenuOpen(false);
                    }}
                  >
                    <Icon size={14} style={{ color: sc.color, marginTop: '2px' }} />
                    <div style={{ textAlign: 'left', flex: 1 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                        {sc.label}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {sc.detail}
                      </div>
                    </div>
                    {isCurrent && <Check size={14} color="#2563eb" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Speed Multiplier Toggle */}
        {onChangeSpeed && (
          <div className="speed-toggle-light">
            {[1.0, 2.0, 5.0].map((s) => (
              <button
                key={s}
                className={`speed-pill-light ${speed === s ? 'active' : ''}`}
                onClick={() => onChangeSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        )}

        {/* User Profile Pill & Logout */}
        {currentUser && (
          <div className="user-profile-pill">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>{currentUser.role === 'driver' ? '👨‍✈️' : '🎓'}</span>
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                  {currentUser.id || currentUser.badge}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="btn-logout"
              title="Log Out of Session"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
