import React, { useState, useEffect } from 'react';
import {
  QrCode, Clock, AlertTriangle, CheckCircle, CreditCard, Shield,
  Smartphone, ArrowRight, ArrowLeft, Zap, RefreshCw, Calendar, Sparkles,
  GraduationCap, FileText, CheckCircle2, XCircle, Lock, Unlock, User
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function PaymentSection({ onToast, onNavigateToStep }) {
  const [ticketsData, setTicketsData] = useState(null);
  const [vtopSummary, setVtopSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [bookingPass, setBookingPass] = useState(false);
  const [activeMetroPass, setActiveMetroPass] = useState(null);
  const [selectedShuttleForScan, setSelectedShuttleForScan] = useState('veh-vit-mh-qrst');
  const [payingTicket, setPayingTicket] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI (Google Pay / PhonePe)');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState('vtop'); // 'vtop', 'metro_pass', 'scan_onboard', 'receipts'

  const SHUTTLE_OPTIONS = [
    { id: 'veh-vit-mh-qrst', name: 'VIT MH Q-R-S-T Express Shuttle (Bus 101)', stop: 'MH Q, R, S, T High-Rise Towers' },
    { id: 'veh-vit-lh', name: 'VIT Ladies Hostel Dedicated Shuttle (Bus 102)', stop: 'LH A - F Blocks & Food Park' },
    { id: 'veh-vit-sjt-tt', name: 'VIT SJT-TT Academic Connector (Bus 103)', stop: 'Silver Jubilee Tower (SJT Block)' }
  ];

  // Fetch Tickets & VTOP Summary
  const fetchAllData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/payments/tickets?student_id=student_demo`).then((r) => r.json()),
      fetch(`${API_BASE}/api/payments/vtop-summary?student_id=student_demo`).then((r) => r.json())
    ])
      .then(([tickets, vtop]) => {
        setTicketsData(tickets);
        setVtopSummary(vtop);
        // Find if there's any active unburned metro pass
        const activePass = tickets?.tickets?.find((t) => t.id.includes('METRO') && !t.is_single_use_burned);
        if (activePass) {
          setActiveMetroPass(activePass);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Book Single-Use Metro Pass (Auto-Debited to V-TOP)
  const handleBookMetroPass = async () => {
    setBookingPass(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/book-metro-pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'student_demo',
          student_name: 'Aarav Sharma',
          vtop_reg_no: '22BCE1042',
          vehicle_id: selectedShuttleForScan,
          stop_id: selectedShuttleForScan.includes('lh') ? 'stop-vit-lh-abcdef' : 'stop-vit-mh-qrst'
        })
      });
      const data = await res.json();
      setBookingPass(false);
      if (data.success) {
        setActiveMetroPass(data.pass);
        if (onToast) onToast(`Metro Single-Use Pass generated! ₹20 charged to V-TOP. Valid for 1 scan only.`, 'success');
        fetchAllData();
        setActiveTab('metro_pass');
      }
    } catch (err) {
      setBookingPass(false);
      if (onToast) onToast(`Error: ${err.message}`, 'error');
    }
  };

  // Handle On-Board QR Scan
  const handleScanQR = async () => {
    setScanning(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/scan-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_data: `VIT-SHUTTLE-${selectedShuttleForScan}`,
          student_id: 'student_demo',
          student_name: 'Aarav Sharma',
          vtop_reg_no: '22BCE1042',
          stop_id: selectedShuttleForScan.includes('lh') ? 'stop-vit-lh-abcdef' : 'stop-vit-mh-qrst'
        })
      });
      const data = await res.json();
      setScanning(false);
      if (data.success) {
        if (onToast) onToast(`Boarding registered! ₹20 added to V-TOP Dues. Due in 24h.`, 'success');
        fetchAllData();
        setActiveTab('vtop');
      }
    } catch (err) {
      setScanning(false);
      if (onToast) onToast(`Scan error: ${err.message}`, 'error');
    }
  };

  // Handle Pay Ticket
  const handleConfirmPayment = async () => {
    if (!payingTicket) return;
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: payingTicket.id,
          payment_method: paymentMethod
        })
      });
      const data = await res.json();
      setIsProcessingPayment(false);
      setPayingTicket(null);
      if (data.success) {
        if (onToast) onToast(`Payment of ₹${data.total_paid} successful! V-TOP Hold Cleared. Ref: ${data.transaction_ref}`, 'success');
        fetchAllData();
      }
    } catch (err) {
      setIsProcessingPayment(false);
      if (onToast) onToast(`Payment failed: ${err.message}`, 'error');
    }
  };

  // Simulate Overdue (Demo Fast-Forward)
  const handleSimulateOverdue = async (ticketId, hoursAgo = 30) => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/simulate-overdue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, hours_ago: hoursAgo })
      });
      const data = await res.json();
      if (data.success) {
        if (onToast) onToast(`Demo Booster: ${hoursAgo}h simulated. +₹${data.ticket.penalty_amount} penalty added. V-TOP Hold Applied!`, 'warning');
        fetchAllData();
      }
    } catch (err) {
      if (onToast) onToast(`Simulation error: ${err.message}`, 'error');
    }
  };

  // Time remaining helper
  const getRemainingTime = (dueAtStr) => {
    if (!dueAtStr) return null;
    const dueAt = new Date(dueAtStr);
    const now = new Date();
    const diffMs = dueAt - now;
    if (diffMs <= 0) return { overdue: true, text: 'Overdue' };
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { overdue: false, text: `${diffHrs}h ${diffMins}m remaining` };
  };

  const pendingTickets = ticketsData?.tickets?.filter((t) => t.status === 'pending') || [];
  const overdueTickets = ticketsData?.tickets?.filter((t) => t.status === 'overdue') || [];
  const paidTickets = ticketsData?.tickets?.filter((t) => t.status === 'paid' || t.status === 'vtop_debited') || [];

  const isVtopClear = (vtopSummary?.total_pending_dues || 0) === 0;

  return (
    <div className="payment-section-container" style={{ padding: '4px' }}>
      {/* V-TOP INSTITUTIONAL STUDENT PROFILE & CLEARANCE BANNER */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          marginBottom: '20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(29, 78, 216, 0.4)'
                }}
              >
                <GraduationCap size={26} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                    V-TOP Student Transit Portal
                  </h2>
                  <span
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}
                  >
                    VIT VELLORE
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Student: <strong>Aarav Sharma</strong> • Reg No: <strong style={{ color: '#38bdf8' }}>22BCE1042</strong> • B.Tech CSE (MH Q-412)
                </div>
              </div>
            </div>

            {/* Escape-Proof Institutional Policy Note */}
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px 14px', marginTop: '12px', maxWidth: '640px' }}>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                🔒 <strong>Zero-Escape Transit Billing:</strong> All shuttle turns (₹20/turn) are charged directly against student registration number <strong>22BCE1042</strong>. Unpaid dues past the 24-hour grace window apply a <strong>₹10/day penalty</strong> and place a hold on <strong>V-TOP Exam Hall Ticket downloads</strong>.
              </div>
            </div>
          </div>

          {/* V-TOP Clearance Status Badge & Dues */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            {/* Clearance Pill */}
            <div
              style={{
                background: isVtopClear ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${isVtopClear ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                padding: '14px 18px',
                borderRadius: '12px',
                textAlign: 'center',
                minWidth: '170px'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                V-TOP Exam Clearance
              </div>
              <div
                style={{
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: isVtopClear ? '#10b981' : '#ef4444',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px'
                }}
              >
                {isVtopClear ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                <span>{isVtopClear ? 'CLEAR (Approved)' : 'ON HOLD'}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1', marginTop: '2px' }}>
                {isVtopClear ? 'Hall Ticket Downloadable' : `Clear ₹${vtopSummary?.total_pending_dues} Dues`}
              </div>
            </div>

            {/* Pending Dues */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '14px 18px',
                borderRadius: '12px',
                textAlign: 'center',
                minWidth: '130px'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>
                Pending Transit Dues
              </div>
              <div
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  color: (vtopSummary?.total_pending_dues || 0) > 0 ? '#f87171' : '#34d399',
                  marginTop: '2px'
                }}
              >
                ₹{vtopSummary?.total_pending_dues || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {overdueTickets.length} overdue • {pendingTickets.length} active
              </div>
            </div>
          </div>
        </div>

        {/* 4 Interactive Feature Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '22px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('vtop')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'vtop' ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={15} />
            <span>V-TOP Dues & 24h Countdown ({pendingTickets.length + overdueTickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('metro_pass')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'metro_pass' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: activeTab === 'metro_pass' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
            }}
          >
            <Sparkles size={15} />
            <span>Metro Single-Use Pass (1-Scan Only)</span>
          </button>

          <button
            onClick={() => setActiveTab('scan_onboard')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'scan_onboard' ? '#7c3aed' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <QrCode size={15} />
            <span>Scan Shuttle Bus QR</span>
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'receipts' ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={15} />
            <span>V-TOP Receipts ({paidTickets.length})</span>
          </button>

          <button
            onClick={fetchAllData}
            title="Refresh Ledger"
            style={{
              marginLeft: 'auto',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* TAB 1: V-TOP DUES & 24-HR COUNTDOWN */}
      {activeTab === 'vtop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Overdue Exam Hold Alert */}
          {overdueTickets.length > 0 && (
            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                <Lock size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#fca5a5' }}>
                  V-TOP Action Required: {overdueTickets.length} Shuttle Ride(s) Exceeded 24-Hour Payment Deadline!
                </div>
                <div style={{ fontSize: '0.82rem', color: '#fecaca', marginTop: '2px' }}>
                  Late penalty of ₹10/day is being added. Institutional hold placed on semester exam hall ticket for Reg No: <strong>22BCE1042</strong>. Pay dues online below to immediately unlock.
                </div>
              </div>
            </div>
          )}

          {/* If No Pending or Overdue */}
          {pendingTickets.length === 0 && overdueTickets.length === 0 && (
            <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                All V-TOP Transit Dues Settled!
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 20px' }}>
                Your student account has zero outstanding transit charges. When boarding campus shuttles, use the 1-scan Metro Pass or scan the bus QR code.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  onClick={() => setActiveTab('metro_pass')}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Sparkles size={16} />
                  <span>Generate Metro Single-Use Pass</span>
                </button>
              </div>
            </div>
          )}

          {/* Cards of Dues */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {[...overdueTickets, ...pendingTickets].map((ticket) => {
              const isOverdue = ticket.status === 'overdue';
              const remaining = getRemainingTime(ticket.due_at);

              return (
                <div
                  key={ticket.id}
                  className="glass-panel"
                  style={{
                    padding: '20px',
                    borderRadius: '14px',
                    border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.45)' : 'rgba(59, 130, 246, 0.3)'}`,
                    background: isOverdue ? 'rgba(239, 68, 68, 0.06)' : 'rgba(30, 41, 59, 0.55)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#38bdf8' }}>
                      RECEIPT: {ticket.vtop_receipt_no}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        background: isOverdue ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isOverdue ? '#ef4444' : '#f59e0b',
                        border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                      }}
                    >
                      {isOverdue ? `⚠️ OVERDUE (+₹${ticket.penalty_amount})` : `⏳ 24-HR DUE WINDOW`}
                    </span>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginBottom: '4px' }}>
                      {ticket.vehicle_label}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      📍 Stop: <strong style={{ color: '#cbd5e1' }}>{ticket.boarded_stop_name}</strong>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '3px' }}>
                      Student ID: {ticket.vtop_reg_no || '22BCE1042'} • Synced with V-TOP
                    </div>
                  </div>

                  {/* 24-hr Countdown & Breakdown */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '6px' }}>
                      <span>Original Cost (1 turn):</span>
                      <span style={{ fontWeight: 700, color: '#f8fafc' }}>₹{ticket.fare_amount}</span>
                    </div>

                    {isOverdue ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#f87171', marginBottom: '6px' }}>
                        <span>Daily Penalty ({ticket.days_overdue} day(s) × ₹10):</span>
                        <span style={{ fontWeight: 800 }}>+₹{ticket.penalty_amount}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#34d399', marginBottom: '6px' }}>
                        <span>Grace window remaining:</span>
                        <span style={{ fontWeight: 700 }}>{remaining?.text}</span>
                      </div>
                    )}

                    <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>Total Payable:</span>
                      <span style={{ fontSize: '1.3rem', fontWeight: 900, color: isOverdue ? '#ef4444' : '#60a5fa' }}>
                        ₹{ticket.total_amount}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setPayingTicket(ticket)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      <CreditCard size={15} />
                      <span>Pay ₹{ticket.total_amount} Now</span>
                    </button>

                    {!isOverdue && (
                      <button
                        onClick={() => handleSimulateOverdue(ticket.id, 28)}
                        title="Demo Presentation Tool: Fast-forward time to simulate >24h overdue and show the penalty rule immediately"
                        style={{
                          padding: '10px 12px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: '8px',
                          color: '#f59e0b',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Zap size={14} />
                        <span>Simulate +24h Overdue</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: METRO-STYLE SINGLE-USE BOARDING PASS (1-SCAN ONLY) */}
      {activeTab === 'metro_pass' && (
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '10px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', marginBottom: '12px' }}>
              <QrCode size={32} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>
              Metro Single-Use Digital Boarding Pass
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.84rem', marginBottom: '20px' }}>
              Pre-authorized transit pass charged directly to V-TOP. Valid for <strong>exactly 1 driver scan</strong>. Prevents screenshot sharing and fraud.
            </p>

            {/* Active Single-Use Pass Display if exists */}
            {activeMetroPass ? (
              <div
                style={{
                  background: activeMetroPass.is_single_use_burned ? 'rgba(239, 68, 68, 0.08)' : 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  border: `2px solid ${activeMetroPass.is_single_use_burned ? '#ef4444' : '#10b981'}`,
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '20px',
                  boxShadow: activeMetroPass.is_single_use_burned ? 'none' : '0 10px 30px rgba(16, 185, 129, 0.2)'
                }}
              >
                {/* Burn Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8' }}>
                    PASS ID: {activeMetroPass.id}
                  </span>
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: activeMetroPass.is_single_use_burned ? '#ef4444' : '#10b981',
                      color: '#fff'
                    }}
                  >
                    {activeMetroPass.is_single_use_burned ? '🔒 BURNED (USED - 1 SCAN EXCEEDED)' : '🟢 READY FOR 1-TIME SCAN'}
                  </span>
                </div>

                {/* Scannable Dynamic QR Image */}
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    margin: '0 auto 16px',
                    background: activeMetroPass.is_single_use_burned ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    position: 'relative'
                  }}
                >
                  <QrCode size={140} color={activeMetroPass.is_single_use_burned ? '#94a3b8' : '#0f172a'} />
                  <span style={{ fontSize: '9px', fontWeight: 800, color: activeMetroPass.is_single_use_burned ? '#ef4444' : '#1e3a8a', marginTop: '4px' }}>
                    {activeMetroPass.is_single_use_burned ? 'EXPIRED / BURNED' : '22BCE1042 • SINGLE ENTRY'}
                  </span>

                  {activeMetroPass.is_single_use_burned && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(239, 68, 68, 0.85)',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '1rem'
                      }}
                    >
                      <XCircle size={36} />
                      <span style={{ marginTop: '6px' }}>PASS USED</span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div style={{ textAlign: 'left', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px', padding: '12px 16px', fontSize: '0.82rem', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Student Reg No:</span>
                    <strong style={{ color: '#38bdf8' }}>{activeMetroPass.vtop_reg_no || '22BCE1042'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>V-TOP Receipt Ref:</span>
                    <strong style={{ color: '#f8fafc' }}>{activeMetroPass.vtop_receipt_no || 'VTOP-TR-2026-ACTIVE'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#94a3b8' }}>Amount Debited:</span>
                    <strong style={{ color: '#10b981' }}>₹20.00</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Validation Rule:</span>
                    <span style={{ color: '#cbd5e1' }}>Single entry • Burned immediately upon scan</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  📱 Show this screen to the shuttle driver console scanner upon boarding.
                </div>
              </div>
            ) : null}

            {/* Book / Generate New Single-Use Pass Button */}
            <div style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Select Shuttle Route for Boarding:
              </label>
              <select
                value={selectedShuttleForScan}
                onChange={(e) => setSelectedShuttleForScan(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.86rem' }}
              >
                {SHUTTLE_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleBookMetroPass}
              disabled={bookingPass}
              style={{
                width: '100%',
                padding: '14px',
                background: bookingPass ? '#64748b' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.98rem',
                fontWeight: 800,
                cursor: bookingPass ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Sparkles size={18} />
              <span>{bookingPass ? 'Generating Pass...' : 'Issue Single-Use Boarding Pass (₹20 to V-TOP)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ON-BOARD SHUTTLE QR SCANNER */}
      {activeTab === 'scan_onboard' && (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '28px', borderRadius: '18px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>On-Board Shuttle QR Scanner</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
              Aim your camera at the scannable QR sticker installed at the shuttle entryway. Fare is ₹20 per trip, added directly to your V-TOP student account.
            </p>

            {/* Viewfinder animation */}
            <div
              style={{
                width: '260px',
                height: '260px',
                margin: '0 auto 24px',
                borderRadius: '16px',
                border: '2px solid #3b82f6',
                background: 'rgba(15, 23, 42, 0.85)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.25)'
              }}
            >
              <div style={{ position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderTop: '3px solid #60a5fa', borderLeft: '3px solid #60a5fa' }} />
              <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderTop: '3px solid #60a5fa', borderRight: '3px solid #60a5fa' }} />
              <div style={{ position: 'absolute', bottom: 12, left: 12, width: 22, height: 22, borderBottom: '3px solid #60a5fa', borderLeft: '3px solid #60a5fa' }} />
              <div style={{ position: 'absolute', bottom: 12, right: 12, width: 22, height: 22, borderBottom: '3px solid #60a5fa', borderRight: '3px solid #60a5fa' }} />

              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%)',
                  boxShadow: '0 0 12px #10b981',
                  animation: 'scanLaser 2.2s infinite ease-in-out'
                }}
              />

              <div style={{ opacity: 0.85 }}>
                <QrCode size={100} color="#93c5fd" />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginTop: '8px' }}>
                  VIT TRANSIT • ₹20 FARE
                </div>
              </div>
            </div>

            <button
              onClick={handleScanQR}
              disabled={scanning}
              style={{
                width: '100%',
                padding: '14px',
                background: scanning ? '#64748b' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '0.98rem',
                fontWeight: 800,
                cursor: scanning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)'
              }}
            >
              <QrCode size={18} />
              <span>{scanning ? 'Validating Boarding...' : 'Scan Shuttle QR (₹20 to V-TOP Account)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: V-TOP SETTLED RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>
            Official V-TOP Digital Transit Receipts
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                  <th style={{ padding: '10px 12px' }}>V-TOP Receipt No</th>
                  <th style={{ padding: '10px 12px' }}>Ticket Ref</th>
                  <th style={{ padding: '10px 12px' }}>Shuttle Bus</th>
                  <th style={{ padding: '10px 12px' }}>Boarding Stop</th>
                  <th style={{ padding: '10px 12px' }}>Method</th>
                  <th style={{ padding: '10px 12px' }}>Fare</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paidTickets.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '12px', fontWeight: 800, color: '#38bdf8' }}>{t.vtop_receipt_no}</td>
                    <td style={{ padding: '12px', color: '#cbd5e1' }}>{t.id}</td>
                    <td style={{ padding: '12px', color: '#f8fafc' }}>{t.vehicle_label}</td>
                    <td style={{ padding: '12px', color: '#94a3b8' }}>{t.boarded_stop_name}</td>
                    <td style={{ padding: '12px', color: '#94a3b8' }}>{t.payment_method || 'V-TOP Auto'}</td>
                    <td style={{ padding: '12px', fontWeight: 800, color: '#34d399' }}>₹{t.total_amount}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700 }}>
                        SETTLED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYMENT GATEWAY MODAL */}
      {payingTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '28px',
              borderRadius: '20px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#3b82f6" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Pay & Clear V-TOP Transit Hold</h3>
              </div>
              <button
                onClick={() => setPayingTicket(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(30, 41, 59, 0.7)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, marginBottom: '4px' }}>
                RECEIPT: {payingTicket.vtop_receipt_no}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                {payingTicket.vehicle_label}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '4px' }}>
                <span>Base Shuttle Ride:</span>
                <span>₹{payingTicket.fare_amount}</span>
              </div>
              {payingTicket.status === 'overdue' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444', marginBottom: '4px' }}>
                  <span>Late Penalty ({payingTicket.days_overdue} day(s)):</span>
                  <span>+₹{payingTicket.penalty_amount}</span>
                </div>
              )}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                <span>Total Amount:</span>
                <span style={{ color: '#34d399' }}>₹{payingTicket.total_amount}</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                Select Payment Mode:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['UPI (Google Pay / PhonePe)', 'VIT Campus SmartCard RFID', 'NetBanking / Debit Card'].map((method) => (
                  <label
                    key={method}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: paymentMethod === method ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${paymentMethod === method ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)'}`,
                      cursor: 'pointer',
                      fontSize: '0.86rem'
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_opt"
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                    />
                    <span>{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={isProcessingPayment}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 800,
                cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isProcessingPayment ? <RefreshCw size={16} className="spin-icon" /> : <Shield size={16} />}
              <span>{isProcessingPayment ? 'Clearing V-TOP Hold...' : `Authorize & Clear ₹${payingTicket.total_amount}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
