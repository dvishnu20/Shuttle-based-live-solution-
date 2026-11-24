import React, { useState, useEffect } from 'react';
import { Play, Square, UserPlus, UserMinus, Radio, ShieldCheck, AlertTriangle, UserCheck, Power, KeyRound, Sparkles, RefreshCw, ArrowLeft, ArrowRight } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function DriverConsole({
  vehicles,
  activeTrip,
  onStartTrip,
  onEndTrip,
  onUpdateOccupancy,
  onSendPosition,
  onToast,
  onNavigateToStep
}) {
  const [selectedVehicleId, setSelectedVehicleId] = useState('veh-vit-mh-qrst');
  const [currentCount, setCurrentCount] = useState(22);
  const [gpsActive, setGpsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Driver Registration State
  const [driverProfile, setDriverProfile] = useState({
    id: 'DRV-101',
    name: 'Rajesh Kumar',
    phone: '+91 98401 23456',
    license_number: 'TN-23-2022-004921',
    assigned_vehicle_id: 'veh-vit-mh-qrst',
    is_on_duty: true,
    status: 'on_duty'
  });

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: 'Rajesh Kumar',
    phone: '+91 98401 23456',
    license_number: 'TN-23-2022-004921',
    assigned_vehicle_id: 'veh-vit-mh-qrst'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single-Use Metro Pass Scanner State
  const [ticketToValidate, setTicketToValidate] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activeStudentPasses, setActiveStudentPasses] = useState([]);

  // Fetch pending / active passes for quick scan testing
  const fetchPasses = () => {
    fetch(`${API_BASE}/api/payments/tickets?student_id=student_demo`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.tickets) {
          setActiveStudentPasses(data.tickets.slice(0, 3));
          if (!ticketToValidate && data.tickets.length > 0) {
            setTicketToValidate(data.tickets[0].id);
          }
        }
      })
      .catch((err) => console.warn('Could not fetch tickets for driver:', err));
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const handleValidatePass = async (code) => {
    const targetCode = code || ticketToValidate;
    if (!targetCode) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/payments/validate-single-use-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: targetCode,
          driver_id: driverProfile?.id || 'DRV-101',
          vehicle_id: selectedVehicleId
        })
      });
      const data = await res.json();
      setIsValidating(false);
      setValidationResult(data);
      if (data.valid) {
        if (onToast) onToast(data.message, 'success');
        setCurrentCount((prev) => Math.min(selectedVehicle.capacity, prev + 1));
      } else {
        if (onToast) onToast(data.message, 'error');
      }
      fetchPasses();
    } catch (err) {
      setIsValidating(false);
      setValidationResult({ valid: false, message: `Validation error: ${err.message}` });
    }
  };


  // Demo driver presets for 1-click evaluation
  const DRIVER_PRESETS = [
    {
      name: 'Rajesh Kumar',
      phone: '+91 98401 23456',
      license_number: 'TN-23-2022-004921',
      assigned_vehicle_id: 'veh-vit-mh-qrst',
      label: 'Rajesh Kumar (Bus 101 - MH Q-T Express)'
    },
    {
      name: 'Murugan V',
      phone: '+91 98402 34567',
      license_number: 'TN-23-2021-008129',
      assigned_vehicle_id: 'veh-vit-lh',
      label: 'Murugan V (Bus 102 - LH Dedicated)'
    },
    {
      name: 'Kavitha R',
      phone: '+91 98403 45678',
      license_number: 'TN-23-2023-001244',
      assigned_vehicle_id: 'veh-vit-sjt-tt',
      label: 'Kavitha R (Bus 103 - SJT Academic)'
    }
  ];

  // Fetch registered driver on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/driver/registered`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          const match = data.find((d) => d.assigned_vehicle_id === selectedVehicleId) || data[0];
          setDriverProfile(match);
        }
      })
      .catch((err) => console.warn('Could not fetch drivers:', err));
  }, [selectedVehicleId]);

  // Handle Driver Registration Submit
  const handleRegisterDriver = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/driver/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });
      const data = await res.json();
      setIsSubmitting(false);
      if (data.success) {
        setDriverProfile(data.driver);
        setSelectedVehicleId(data.driver.assigned_vehicle_id);
        setShowRegisterModal(false);
        if (onToast) onToast(`Driver ${data.driver.name} registered! Live tracking is now active.`, 'success');
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(`Registration error: ${err.message}`);
    }
  };

  // Handle Duty Status Toggle (On-Duty / Off-Duty)
  const handleToggleDuty = async () => {
    if (!driverProfile) return;
    const nextStatus = !driverProfile.is_on_duty;
    try {
      const res = await fetch(`${API_BASE}/api/driver/duty-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: driverProfile.id,
          is_on_duty: nextStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        setDriverProfile((prev) => ({
          ...prev,
          is_on_duty: data.is_on_duty,
          status: data.status
        }));
        if (onToast) onToast(data.message, data.is_on_duty ? 'success' : 'warning');
      }
    } catch (err) {
      if (onToast) onToast(`Error updating duty status: ${err.message}`, 'error');
    }
  };

  const selectedVehicle = vehicles.find((v) => v.vehicle_id === selectedVehicleId || v.id === selectedVehicleId) || {
    id: selectedVehicleId,
    label: selectedVehicleId.includes('lh') ? 'VIT Ladies Hostel Shuttle (Bus 102)' : 'VIT MH Q-R-S-T Express Shuttle (Bus 101)',
    capacity: 40
  };

  const handleTally = async (delta) => {
    setErrorMessage('');
    const newCount = currentCount + delta;
    if (newCount < 0 || newCount > selectedVehicle.capacity) {
      setErrorMessage(`Cannot exceed bounds: 0 to ${selectedVehicle.capacity} seats.`);
      return;
    }
    setCurrentCount(newCount);
    try {
      await onUpdateOccupancy({
        trip_id: activeTrip?.id || 'trip-1',
        boarded: delta > 0 ? 1 : 0,
        alighted: delta < 0 ? 1 : 0,
        current_count: newCount,
        source: 'driver'
      });
    } catch (err) {
      setErrorMessage(err.message || 'Error updating occupancy');
    }
  };

  const handleManualCountSubmit = async (val) => {
    setErrorMessage('');
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || num > selectedVehicle.capacity) {
      setErrorMessage(`Invalid count! Must be between 0 and vehicle capacity ${selectedVehicle.capacity}.`);
      return;
    }
    setCurrentCount(num);
    try {
      await onUpdateOccupancy({
        trip_id: activeTrip?.id || 'trip-1',
        current_count: num,
        source: 'driver'
      });
    } catch (err) {
      setErrorMessage(err.message || 'Error updating occupancy');
    }
  };

  return (
    <div className="driver-dashboard" style={{ padding: '4px' }}>
      {/* Top Driver Registration & Status Card (Light Mode) */}
      <div
        className="light-card"
        style={{
          padding: '24px',
          marginBottom: '20px',
          borderRadius: '16px',
          background: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                <UserCheck size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Shuttle Driver & Tracking Terminal</h2>
                <div style={{ fontSize: '0.84rem', color: '#64748b' }}>
                  Live vehicle GPS & arrival tracking strictly depends on registered driver duty status
                </div>
              </div>
            </div>
          </div>

          {/* Registration / Switch Driver Button */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowRegisterModal(true)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <KeyRound size={15} />
              <span>Register / Switch Driver</span>
            </button>
          </div>
        </div>

        {/* Current Driver Identity Banner & Duty Toggle */}
        <div
          style={{
            background: driverProfile?.is_on_duty ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${driverProfile?.is_on_duty ? '#a7f3d0' : '#fecaca'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: driverProfile?.is_on_duty ? '#d1fae5' : '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: driverProfile?.is_on_duty ? '#059669' : '#dc2626'
              }}
            >
              <Power size={22} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  {driverProfile?.name || 'Unregistered Driver'}
                </span>
                <span
                  style={{
                    background: driverProfile?.is_on_duty ? '#059669' : '#dc2626',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}
                >
                  {driverProfile?.is_on_duty ? 'ON-DUTY • TRACKING ACTIVE' : 'OFF-DUTY • TRACKING PAUSED'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '3px' }}>
                Badge: <strong>{driverProfile?.license_number || 'TN-23-2022-004921'}</strong> • Phone: {driverProfile?.phone || '+91 98401 23456'} • Vehicle: {selectedVehicle.label}
              </div>
            </div>
          </div>

          {/* Big Duty Toggle Button */}
          <button
            onClick={handleToggleDuty}
            style={{
              padding: '11px 22px',
              borderRadius: '8px',
              border: 'none',
              background: driverProfile?.is_on_duty ? '#dc2626' : '#059669',
              color: '#fff',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: driverProfile?.is_on_duty ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 4px 12px rgba(5, 150, 105, 0.3)'
            }}
          >
            <Power size={16} />
            <span>{driverProfile?.is_on_duty ? 'Go Off-Duty (Pause Tracking)' : 'Go On-Duty (Broadcast Live GPS)'}</span>
          </button>
        </div>

        {/* Explain Tracking Rule */}
        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          💡 <strong>Driver Telemetry:</strong> Shuttle live GPS tracking and ETA predictions are strictly coupled with the registered driver's duty status. When Off-Duty, the shuttle is displayed as <em>"Standby / Off-Duty"</em>.
        </div>
      </div>

      {/* Main Operational Controls: Vehicle & Tally */}
      <div className="light-card" style={{ padding: '24px', borderRadius: '16px', marginBottom: '20px', background: '#ffffff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
              Select Assigned Shuttle Vehicle
            </label>
            <select
              className="light-dropdown"
              value={selectedVehicleId}
              onChange={(e) => {
                setSelectedVehicleId(e.target.value);
                setRegForm((prev) => ({ ...prev, assigned_vehicle_id: e.target.value }));
              }}
            >
              <option value="veh-vit-mh-qrst">VIT MH Q-R-S-T Express Shuttle (Bus 101) - 40 seats</option>
              <option value="veh-vit-lh">VIT Ladies Hostel Dedicated Shuttle (Bus 102) - 40 seats</option>
              <option value="veh-vit-sjt-tt">VIT SJT-TT Academic Connector (Bus 103) - 40 seats</option>
              <option value="veh-spare-1">VIT Standby EcoShuttle (Spare 104) - 40 seats</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '5px' }}>
              GPS Telemetry Stream
            </label>
            <button
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                background: gpsActive && driverProfile?.is_on_duty ? '#ecfdf5' : '#fef2f2',
                color: gpsActive && driverProfile?.is_on_duty ? '#059669' : '#dc2626',
                border: `1px solid ${gpsActive && driverProfile?.is_on_duty ? '#a7f3d0' : '#fecaca'}`,
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onClick={() => setGpsActive(!gpsActive)}
            >
              <Radio size={16} />
              <span>
                {driverProfile?.is_on_duty
                  ? gpsActive
                    ? 'GPS Sharing: ACTIVE (Transmitting)'
                    : 'GPS Sharing: PAUSED'
                  : 'GPS Sharing: INACTIVE (Driver Off-Duty)'}
              </span>
            </button>
          </div>
        </div>

        {/* Start / End Trip Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onClick={() => onStartTrip(selectedVehicleId)}
          >
            <Play size={16} />
            <span>Start Active Campus Trip</span>
          </button>

          <button
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onClick={() => onEndTrip(activeTrip?.id || 'trip-1')}
          >
            <Square size={16} />
            <span>End Trip</span>
          </button>
        </div>

        {/* Live Passenger Occupancy Tally (Light Mode) */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
            Passenger Boarding & Tally Counter
          </h3>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '18px 24px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                className="tally-btn tally-minus"
                onClick={() => handleTally(-1)}
                title="Subtract 1 Passenger"
                style={{ width: '48px', height: '48px', fontSize: '1.3rem', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <UserMinus size={22} />
              </button>

              <div style={{ textAlign: 'center', minWidth: '110px' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                  {currentCount}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  / {selectedVehicle.capacity} seats ({selectedVehicle.capacity - currentCount} free)
                </div>
              </div>

              <button
                className="tally-btn tally-plus"
                onClick={() => handleTally(1)}
                title="Add 1 Boarded Passenger"
                style={{ width: '48px', height: '48px', fontSize: '1.3rem', borderRadius: '10px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <UserPlus size={22} />
              </button>
            </div>

            {/* Quick Set Direct Count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Direct Count:</span>
              <input
                type="number"
                min="0"
                max={selectedVehicle.capacity}
                placeholder={currentCount.toString()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleManualCountSubmit(e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{
                  width: '75px',
                  padding: '8px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {errorMessage && (
            <div style={{ color: '#dc2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* METRO SINGLE-USE PASS DOOR VALIDATOR */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Sparkles size={18} color="#059669" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Metro Single-Use Pass Door Validator (1-Scan Burn)
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px' }}>
            Scan or validate student digital boarding passes at the doorway. Each pass is valid for <strong>only 1 scan</strong> and automatically increments the bus occupancy count.
          </p>

          {/* Validation Feedback Alert if any */}
          {validationResult && (
            <div
              style={{
                background: validationResult.valid ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${validationResult.valid ? '#a7f3d0' : '#fecaca'}`,
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              {validationResult.valid ? <ShieldCheck size={20} color="#059669" /> : <AlertTriangle size={20} color="#dc2626" />}
              <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 700, color: validationResult.valid ? '#065f46' : '#991b1b' }}>
                {validationResult.message}
              </div>
            </div>
          )}

          {/* Quick Scan Input & Action */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Enter Student Pass ID (e.g. TKT-METRO-XXXX)"
              value={ticketToValidate}
              onChange={(e) => setTicketToValidate(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.88rem',
                fontWeight: 600
              }}
            />
            <button
              onClick={() => handleValidatePass()}
              disabled={isValidating || !ticketToValidate}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isValidating ? '#64748b' : '#059669',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 800,
                cursor: isValidating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
              }}
            >
              <ShieldCheck size={16} />
              <span>{isValidating ? 'Validating...' : 'Validate & Burn Pass (+1)'}</span>
            </button>
          </div>

          {/* Quick Student Passes for 1-Click Evaluation */}
          {activeStudentPasses.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>Quick Demo Passes:</span>
              {activeStudentPasses.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setTicketToValidate(p.id);
                    handleValidatePass(p.id);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: p.is_single_use_burned ? '#fef2f2' : '#eff6ff',
                    border: `1px solid ${p.is_single_use_burned ? '#fecaca' : '#bfdbfe'}`,
                    color: p.is_single_use_burned ? '#dc2626' : '#2563eb',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {p.id} {p.is_single_use_burned ? '(Already Burned)' : '(Ready to Scan)'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DRIVER REGISTRATION MODAL (Light Mode) */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '28px',
              borderRadius: '16px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck size={20} color="#059669" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Register Shuttle Driver</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: '18px' }}>
              Shuttle live tracking requires an authenticated driver profile. Choose a quick demo profile or enter custom driver details.
            </p>

            {/* Quick Demo Profile Presets */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Quick 1-Click Demo Profiles:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DRIVER_PRESETS.map((p) => (
                  <button
                    key={p.license_number}
                    type="button"
                    onClick={() => {
                      setRegForm({
                        name: p.name,
                        phone: p.phone,
                        license_number: p.license_number,
                        assigned_vehicle_id: p.assigned_vehicle_id
                      });
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: regForm.license_number === p.license_number ? '#eff6ff' : '#f8fafc',
                      color: regForm.license_number === p.license_number ? '#1d4ed8' : '#334155',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Registration Form */}
            <form onSubmit={handleRegisterDriver} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Driver Full Name
                </label>
                <input
                  type="text"
                  required
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Commercial License / Badge Number
                </label>
                <input
                  type="text"
                  required
                  value={regForm.license_number}
                  onChange={(e) => setRegForm({ ...regForm, license_number: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Contact Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Assign Shuttle Vehicle
                </label>
                <select
                  value={regForm.assigned_vehicle_id}
                  onChange={(e) => setRegForm({ ...regForm, assigned_vehicle_id: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a' }}
                >
                  <option value="veh-vit-mh-qrst">Bus 101 - VIT MH Q-R-S-T Express</option>
                  <option value="veh-vit-lh">Bus 102 - VIT Ladies Hostel Dedicated</option>
                  <option value="veh-vit-sjt-tt">Bus 103 - VIT SJT-TT Academic Connector</option>
                  <option value="veh-spare-1">Spare 104 - Standby EcoShuttle</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isSubmitting ? <RefreshCw size={16} className="spin-icon" /> : <ShieldCheck size={16} />}
                <span>{isSubmitting ? 'Registering Driver...' : 'Complete Registration & Activate Tracking'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
