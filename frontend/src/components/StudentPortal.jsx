import React, { useState } from 'react';
import { MapPin, QrCode, Navigation, Clock, ShieldCheck, Ticket, CreditCard, Sparkles } from 'lucide-react';
import StudentView from './StudentView';
import PaymentSection from './PaymentSection';

export default function StudentPortal({
  stops,
  selectedStopId,
  onSelectStop,
  arrivalsData,
  vehicles,
  onCheckIn,
  hasCheckedIn,
  onToast,
  currentUser
}) {
  const [activeSubTab, setActiveSubTab] = useState('tracker'); // 'tracker' or 'pass'

  return (
    <div className="student-portal-container">
      {/* Student Portal Sub-Navigation Tabs */}
      <div className="portal-subnav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className={`subnav-pill ${activeSubTab === 'tracker' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('tracker')}
          >
            <MapPin size={15} />
            <span>Live Shuttle Tracker & Campus Map</span>
          </button>

          <button
            className={`subnav-pill ${activeSubTab === 'pass' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('pass')}
          >
            <QrCode size={15} />
            <span>V-TOP ₹20 Pass & Transit Dues</span>
          </button>
        </div>

        {/* Student Quick Status Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#475569' }}>
          <span>Student: <strong style={{ color: '#0f172a' }}>{currentUser?.name || 'Aarav Sharma'}</strong> ({currentUser?.id || '22BCE1042'})</span>
          <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.7rem' }}>
            ✓ Exam Clearance OK
          </span>
        </div>
      </div>

      {/* Render Selected View */}
      {activeSubTab === 'tracker' && (
        <StudentView
          stops={stops}
          selectedStopId={selectedStopId}
          onSelectStop={onSelectStop}
          arrivalsData={arrivalsData}
          vehicles={vehicles}
          onCheckIn={onCheckIn}
          hasCheckedIn={hasCheckedIn}
          onOpenPayment={() => setActiveSubTab('pass')}
          onNavigateToStep={() => setActiveSubTab('pass')}
        />
      )}

      {activeSubTab === 'pass' && (
        <PaymentSection
          onToast={onToast}
          onNavigateToStep={() => setActiveSubTab('tracker')}
        />
      )}
    </div>
  );
}
