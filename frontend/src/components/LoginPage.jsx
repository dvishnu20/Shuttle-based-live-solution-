import React, { useState } from 'react';
import { Bus, User, Gauge, Shield, KeyRound, ArrowRight, CheckCircle2, Sparkles, Building2, MapPin } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState('student');
  const [studentRegNo, setStudentRegNo] = useState('22BCE1042');
  const [studentPassword, setStudentPassword] = useState('vitvellore123');
  const [driverBadge, setDriverBadge] = useState('TN-23-2022-004921');
  const [driverPassword, setDriverPassword] = useState('driverpass123');

  const handleStudentSubmit = (e) => {
    e.preventDefault();
    onLogin({
      role: 'student',
      name: 'Aarav Sharma',
      id: studentRegNo || '22BCE1042',
      department: 'B.Tech CSE (MH Q-412)',
      email: 'aarav.sharma2022@vitstudent.ac.in'
    });
  };

  const handleDriverSubmit = (e) => {
    e.preventDefault();
    onLogin({
      role: 'driver',
      name: 'Rajesh Kumar',
      id: 'DRV-101',
      badge: driverBadge || 'TN-23-2022-004921',
      phone: '+91 98401 23456',
      assignedVehicle: 'Bus 101 (MH Q-R-S-T Express)'
    });
  };

  const quickDemoStudent = () => {
    onLogin({
      role: 'student',
      name: 'Aarav Sharma',
      id: '22BCE1042',
      department: 'B.Tech Computer Science (MH Q-412)',
      email: 'aarav.sharma2022@vitstudent.ac.in'
    });
  };

  const quickDemoDriver = () => {
    onLogin({
      role: 'driver',
      name: 'Rajesh Kumar',
      id: 'DRV-101',
      badge: 'TN-23-2022-004921',
      phone: '+91 98401 23456',
      assignedVehicle: 'Bus 101 (MH Q-R-S-T Express)'
    });
  };

  return (
    <div className="login-page-container">
      {/* Top University Brand Bar */}
      <div className="login-brand-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="login-logo-box">
            <Bus size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                CampusMove AI
              </span>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '9999px', border: '1px solid #bfdbfe' }}>
                VIT VELLORE
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              Smart College Transit, V-TOP Dues & Peak Demand Optimizer
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#059669', fontWeight: 700, background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span>Official Campus Portal</span>
        </div>
      </div>

      {/* Main Login Card Wrap */}
      <div className="login-card-wrap">
        <div className="login-card">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
              Welcome to Campus Transit
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
              Select your role to access the Student Portal or Driver Console
            </p>
          </div>

          {/* Role Selection Switcher */}
          <div className="login-role-selector">
            <button
              type="button"
              className={`login-role-btn ${selectedRole === 'student' ? 'active' : ''}`}
              onClick={() => setSelectedRole('student')}
            >
              <User size={16} />
              <span>Student Portal</span>
            </button>
            <button
              type="button"
              className={`login-role-btn ${selectedRole === 'driver' ? 'active' : ''}`}
              onClick={() => setSelectedRole('driver')}
            >
              <Gauge size={16} />
              <span>Driver Terminal</span>
            </button>
          </div>

          {/* STUDENT LOGIN FORM */}
          {selectedRole === 'student' && (
            <div>
              <form onSubmit={handleStudentSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    VIT REGISTRATION NUMBER
                  </label>
                  <input
                    type="text"
                    value={studentRegNo}
                    onChange={(e) => setStudentRegNo(e.target.value)}
                    placeholder="e.g. 22BCE1042"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    V-TOP STUDENT PASSWORD
                  </label>
                  <input
                    type="password"
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                      transition: 'border 0.2s'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '8px',
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Log In to Student Portal</span>
                  <ArrowRight size={15} />
                </button>
              </form>

              {/* Instant 1-Click Demo Login Box */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 14px',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ⚡ Instant Demo Access
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 700 }}>Pre-configured</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#334155', marginBottom: '8px' }}>
                  Logged-in Student: <strong>Aarav Sharma</strong> (22BCE1042 • MH Q-412)
                </div>
                <button
                  type="button"
                  onClick={quickDemoStudent}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: '#1d4ed8',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(29, 78, 216, 0.25)'
                  }}
                >
                  <Sparkles size={14} />
                  <span>Click for Instant Student Demo Login</span>
                </button>
              </div>
            </div>
          )}

          {/* DRIVER LOGIN FORM */}
          {selectedRole === 'driver' && (
            <div>
              <form onSubmit={handleDriverSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    DRIVER BADGE / LICENSE NUMBER
                  </label>
                  <input
                    type="text"
                    value={driverBadge}
                    onChange={(e) => setDriverBadge(e.target.value)}
                    placeholder="e.g. TN-23-2022-004921"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                    DRIVER TERMINAL PIN
                  </label>
                  <input
                    type="password"
                    value={driverPassword}
                    onChange={(e) => setDriverPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '8px',
                    background: '#059669',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Log In to Driver Terminal</span>
                  <ArrowRight size={15} />
                </button>
              </form>

              {/* Instant 1-Click Demo Login Box */}
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '10px',
                padding: '12px 14px',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ⚡ Instant Demo Access
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>Pre-configured</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#334155', marginBottom: '8px' }}>
                  Driver: <strong>Rajesh Kumar</strong> (Badge TN-23-2022-004921 • Bus 101)
                </div>
                <button
                  type="button"
                  onClick={quickDemoDriver}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: '#047857',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(4, 120, 87, 0.25)'
                  }}
                >
                  <Sparkles size={14} />
                  <span>Click for Instant Driver Demo Login</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Footer note */}
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <Shield size={13} color="#059669" />
          <span>VIT Vellore Secured Shuttle Grid • Single Sign-On Enabled</span>
        </div>
      </div>
    </div>
  );
}
