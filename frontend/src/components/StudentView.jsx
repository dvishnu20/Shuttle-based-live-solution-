import React, { useState, useEffect } from 'react';
import {
  Clock, Users, CheckCircle2, AlertCircle, ArrowRight, MapPin,
  Navigation, Phone, Mail, BookOpen, Search, QrCode, Sparkles, Filter, X
} from 'lucide-react';
import CampusMap from './CampusMap';

export default function StudentView({
  stops,
  selectedStopId,
  onSelectStop,
  arrivalsData,
  vehicles,
  onCheckIn,
  hasCheckedIn,
  onOpenPayment,
  onNavigateToStep
}) {
  const DEFAULT_VIT_DIRECTORY = {
    "stop-vit-mh-qrst": {
      "cluster_name": "MH Q, R, S, T High-Rise Blocks",
      "description": "Northern towers near Outdoor Stadium and Swimming Pool.",
      "blocks": [
        {"code": "MH Q", "name": "VAJPAYEE BLOCK", "phone": "0416 220 2548", "email": "mhqblock@vit.ac.in"},
        {"code": "MH R", "name": "MUTHAMIZH ARIGNAR KALAIGNAR M.KARUNANIDHI", "phone": "0416 220 2549", "email": "mhrblock@vit.ac.in"},
        {"code": "MH S", "name": "ABDUL KALAM BLOCK", "phone": "0416 220 2550", "email": "mhsblock@vit.ac.in"},
        {"code": "MH T", "name": "JAGADISH CHANDRA BOSE BLOCK", "phone": "0416 220 2551", "email": "mhtblock@vit.ac.in"}
      ]
    },
    "stop-vit-mh-ghjkl": {
      "cluster_name": "MH G, H, J, K, L Blocks (Darling Mess Hub)",
      "description": "Adjacent to Darling Special Mess, Food Mall and Nescafe.",
      "blocks": [
        {"code": "MH G", "name": "SOCRATES", "phone": "0416 220 2539", "email": "mhgblock@vit.ac.in"},
        {"code": "MH H", "name": "JOHN F KENNEDY", "phone": "0416 220 2540", "email": "mhhblock@vit.ac.in"},
        {"code": "MH J", "name": "JOHN F KENNEDY", "phone": "0416 220 2541", "email": "mhjblock@vit.ac.in"},
        {"code": "MH K", "name": "Dr. SARVEPALLI RADHAKRISHNAN", "phone": "0416 220 2542", "email": "mhkblock@vit.ac.in"},
        {"code": "MH L", "name": "NETAJI SUBHAS CHANDRA BOSE", "phone": "0416 220 2543", "email": "mhlblock@vit.ac.in"}
      ]
    },
    "stop-vit-mh-mnp": {
      "cluster_name": "MH M, N, P Blocks (Central Quad)",
      "description": "Central hostel walkway connecting to Outdoor Sports Stadium.",
      "blocks": [
        {"code": "MH M", "name": "QUAID-E- MILLAT MUHAMMED ISMAIL", "phone": "0416 220 2544", "email": "mhmblock@vit.ac.in"},
        {"code": "MH M ANNEX", "name": "QUAID-E- MILLAT - M ANNEX", "phone": "0416 220 2545", "email": "mhmannexblock@vit.ac.in"},
        {"code": "MH N", "name": "CHARLES DARWIN", "phone": "0416 220 2546", "email": "mhnblock@vit.ac.in"},
        {"code": "MH N ANNEX", "name": "CHARLES DARWIN - N ANNEX", "phone": "0416 220 2564", "email": "mhnannexblock@vit.ac.in"},
        {"code": "MH P", "name": "SARDAR PATEL", "phone": "0416 220 2547", "email": "mhpblock@vit.ac.in"}
      ]
    },
    "stop-vit-mh-abcdef": {
      "cluster_name": "MH A - F Blocks (West Hostel Zone)",
      "description": "Near Technology Tower, Anna Auditorium and Enzo.",
      "blocks": [
        {"code": "MH A", "name": "ALBERT EINSTEIN", "phone": "0416 220 2531", "email": "mhablock@vit.ac.in"},
        {"code": "MH B", "name": "SWAMI VIVEKANANDA", "phone": "0416 220 2532", "email": "mhbblock@vit.ac.in"},
        {"code": "MH B ANNEX", "name": "SWAMI VIVEKANANDA – B ANNEX", "phone": "0416 220 2533", "email": "mhbannex@vit.ac.in"},
        {"code": "MH C", "name": "RABINDRANATH TAGORE", "phone": "0416 220 2534", "email": "mhcblock@vit.ac.in"},
        {"code": "MH D", "name": "NELSON MANDELA", "phone": "0416 220 2535", "email": "mhdblock@vit.ac.in"},
        {"code": "MH D ANNEX", "name": "NELSON MANDELA – D ANNEX", "phone": "0416 220 2536", "email": "mhdannex@vit.ac.in"},
        {"code": "MH E", "name": "SIR C.V.RAMAN", "phone": "0416 220 2537", "email": "mheblock@vit.ac.in"},
        {"code": "MH F", "name": "RAMANUJAM", "phone": "0416 220 2538", "email": "mhfblock@vit.ac.in"}
      ]
    },
    "stop-vit-lh-abcdef": {
      "cluster_name": "LH A - F Blocks (Main Ladies Hostel & Food Park)",
      "description": "Main LH Quadrangle adjacent to Food Park & Tiruvallur statue.",
      "blocks": [
        {"code": "LH A", "name": "Ladies Hostel Block A", "phone": "0416 220 2669", "email": "lhablock@vit.ac.in"},
        {"code": "LH B", "name": "Ladies Hostel Block B", "phone": "0416 220 2670", "email": "lhbblock@vit.ac.in"},
        {"code": "LH C", "name": "Ladies Hostel Block C", "phone": "0416 220 2703", "email": "lhcblock@vit.ac.in"},
        {"code": "LH D", "name": "Ladies Hostel Block D", "phone": "0416 220 2704", "email": "lhdblock@vit.ac.in"},
        {"code": "LH E", "name": "Ladies Hostel Block E", "phone": "0416 220 2705", "email": "lheblock@vit.ac.in"},
        {"code": "LH F", "name": "Ladies Hostel Block F", "phone": "0416 220 2706", "email": "lhfblock@vit.ac.in"}
      ]
    },
    "stop-vit-lh-ghj": {
      "cluster_name": "LH G, H, J, RGT & GH Annex Towers",
      "description": "North Ladies Hostel towers with direct pathway to SJT & TT.",
      "blocks": [
        {"code": "LH G", "name": "Ladies Hostel Block G", "phone": "0416 220 2892", "email": "lhgblock@vit.ac.in"},
        {"code": "LH H", "name": "Ladies Hostel Block H", "phone": "0416 220 2894", "email": "lhhblock@vit.ac.in"},
        {"code": "LH J", "name": "Ladies Hostel Block J", "phone": "0416 220 2896", "email": "lhjblock@vit.ac.in"},
        {"code": "RGT H", "name": "RGT Hostel Block", "phone": "0416 220 5003", "email": "rgthblock@vit.ac.in"},
        {"code": "LH GH", "name": "LH GH (Annex)", "phone": "0416 220 2244", "email": "lhghannex@vit.ac.in"}
      ]
    }
  };

  const [destStopId, setDestStopId] = useState('stop-vit-tt');
  const [hostelDirectory, setHostelDirectory] = useState(DEFAULT_VIT_DIRECTORY);
  const [showFullDirectory, setShowFullDirectory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  // Fetch official VIT Hostel Directory from backend
  useEffect(() => {
    fetch('http://localhost:8000/api/stops/hostel-directory')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && !data.detail) {
          setHostelDirectory(data);
        }
      })
      .catch(err => console.warn('Using default VIT hostel directory:', err.message));
  }, []);

  const selectedStop = stops.find(s => s.id === selectedStopId) || stops[0];
  const destStop = stops.find(s => s.id === destStopId) || stops[2] || stops[1];
  const primaryArrival = arrivalsData?.arrivals?.[0];
  const alternateArrival = arrivalsData?.arrivals?.find(a => a.is_alternate) || arrivalsData?.arrivals?.[1];

  // Inter-block distance & transit calculation
  const calculateStopDistance = () => {
    if (!selectedStop || !destStop) return null;
    const R = 6371000;
    const phi1 = (selectedStop.latitude * Math.PI) / 180;
    const phi2 = (destStop.latitude * Math.PI) / 180;
    const dPhi = ((destStop.latitude - selectedStop.latitude) * Math.PI) / 180;
    const dLam = ((destStop.longitude - selectedStop.longitude) * Math.PI) / 180;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distM = Math.round(R * c);
    return {
      meters: distM,
      formatted: distM < 1000 ? `${distM} meters` : `${(distM / 1000).toFixed(1)} km`,
      walkMins: Math.max(1, Math.round(distM / 75)), // ~4.5 km/h
      shuttleMins: Math.max(1, Math.round(distM / 280)) // ~17 km/h
    };
  };

  const journeyInfo = calculateStopDistance();

  const getBadgeStyle = (category) => {
    switch (category) {
      case 'Available':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case 'Filling':
        return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
      case 'Nearly full':
        return { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
      case 'Full':
        return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      default:
        return { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
    }
  };

  const getMeterColor = (category) => {
    switch (category) {
      case 'Available': return '#10b981';
      case 'Filling': return '#f59e0b';
      case 'Nearly full': return '#f97316';
      case 'Full': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  // Filter stops by category
  const filteredStops = stops.filter(s => {
    if (activeCategoryFilter === 'all') return true;
    if (activeCategoryFilter === 'mens_hostel') return s.id.includes('mh');
    if (activeCategoryFilter === 'ladies_hostel') return s.id.includes('lh');
    if (activeCategoryFilter === 'academic') return s.id.includes('tt') || s.id.includes('sjt') || s.id.includes('mb');
    if (activeCategoryFilter === 'gate') return s.id.includes('gate');
    return true;
  });

  // Flattened block directory for full search
  const activeDirectory = hostelDirectory || DEFAULT_VIT_DIRECTORY;
  const allBlocksList = Object.entries(activeDirectory).flatMap(([clusterId, cluster]) =>
    Array.isArray(cluster?.blocks)
      ? cluster.blocks.map(b => ({ ...b, clusterName: cluster.cluster_name, clusterId }))
      : []
  );

  const filteredBlocks = (allBlocksList || []).filter(b =>
    (b?.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b?.phone || '').includes(searchQuery)
  );

  const primaryBadge = primaryArrival ? getBadgeStyle(primaryArrival.occupancy_category) : null;
  const altBadge = alternateArrival ? getBadgeStyle(alternateArrival.occupancy_category) : null;

  return (
    <div className="student-grid">
      {/* Left Column: Clean, Structured Light Mode Transit Control Panel */}
      <div className="student-sidebar">

        {/* Card 1: Campus Route & Stop Selector */}
        <div className="light-card" style={{ padding: '18px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              📍 Campus Transit Route
            </span>
            <button
              onClick={() => setShowFullDirectory(true)}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#2563eb',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Phone size={12} />
              <span>Hostel Directory</span>
            </button>
          </div>

          {/* Quick Zone Category Chips */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Stops' },
              { id: 'mens_hostel', label: '🏢 Men Hostels' },
              { id: 'ladies_hostel', label: '🌸 Ladies Hostels' },
              { id: 'academic', label: '🎓 Academic' },
              { id: 'gate', label: '⛩️ Gate 1' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryFilter(tab.id)}
                style={{
                  background: activeCategoryFilter === tab.id ? '#2563eb' : '#f1f5f9',
                  border: `1px solid ${activeCategoryFilter === tab.id ? '#1d4ed8' : '#e2e8f0'}`,
                  color: activeCategoryFilter === tab.id ? '#ffffff' : '#475569',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Boarding Stop (Origin) Dropdown */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 700, marginBottom: '5px' }}>
              BOARDING STOP (ORIGIN)
            </label>
            <select
              className="light-dropdown"
              value={selectedStopId}
              onChange={(e) => onSelectStop(e.target.value)}
            >
              {filteredStops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Stop Dropdown */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#475569', fontWeight: 700, marginBottom: '5px' }}>
              DESTINATION BLOCK
            </label>
            <select
              className="light-dropdown"
              value={destStopId}
              onChange={(e) => setDestStopId(e.target.value)}
            >
              {stops.filter(s => s.id !== selectedStopId).map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Walking vs Shuttle Distance Metric */}
          {journeyInfo && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 700 }}>
                <Navigation size={14} />
                <span>Distance: {journeyInfo.formatted}</span>
              </div>
              <div style={{ color: '#475569', fontSize: '0.74rem' }}>
                🚶 ~{journeyInfo.walkMins}m walk • 🚌 ~{journeyInfo.shuttleMins}m shuttle
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Live Upcoming Shuttle Hero Card */}
        {primaryArrival ? (
          <div className="light-card" style={{ padding: '18px', marginBottom: '16px' }}>
            {/* Header: Shuttle Route & Occupancy Category */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>🚌</span>
                <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{primaryArrival.vehicle_label}</span>
              </div>
              {primaryBadge && (
                <span style={{
                  background: primaryBadge.bg,
                  color: primaryBadge.color,
                  border: `1px solid ${primaryBadge.border}`,
                  padding: '3px 9px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 800
                }}>
                  {primaryArrival.occupancy_category}
                </span>
              )}
            </div>

            {/* Countdown ETA & Proximity Distance Display */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '8px 0 14px' }}>
              <div>
                <div style={{ color: primaryArrival.is_stale ? '#db2777' : '#0f172a', fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>
                  {primaryArrival.eta_formatted}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                  {primaryArrival.eta_formatted !== 'Unavailable' && primaryArrival.eta_formatted !== 'Arriving' ? 'ESTIMATED ARRIVAL TIME' : 'CAMPUS SHUTTLE'}
                </div>
              </div>

              {/* Shuttle Distance Badge */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '6px 12px',
                textAlign: 'right'
              }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Live Distance
                </div>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#1d4ed8' }}>
                  📍 {primaryArrival.distance_formatted || 'Approaching'}
                </div>
              </div>
            </div>

            {/* Verified Driver & Freshness Pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: primaryArrival.is_stale ? '#fdf2f8' : '#f8fafc',
                border: `1px solid ${primaryArrival.is_stale ? '#fbcfe8' : '#e2e8f0'}`,
                color: primaryArrival.is_stale ? '#be185d' : '#475569',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600
              }}>
                <Clock size={12} />
                {primaryArrival.is_stale
                  ? `Stale GPS (${Math.round(primaryArrival.freshness_seconds)}s ago)`
                  : `GPS verified ${Math.round(primaryArrival.freshness_seconds)}s ago`}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                👨‍✈️ Driver: <strong>{primaryArrival.driver_name || 'Rajesh Kumar'}</strong>
                <span style={{
                  fontSize: '0.68rem',
                  background: primaryArrival.is_driver_on_duty ? '#ecfdf5' : '#fef2f2',
                  color: primaryArrival.is_driver_on_duty ? '#059669' : '#dc2626',
                  border: `1px solid ${primaryArrival.is_driver_on_duty ? '#a7f3d0' : '#fecaca'}`,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 800
                }}>
                  {primaryArrival.is_driver_on_duty ? 'ON-DUTY' : 'OFF-DUTY'}
                </span>
              </span>
            </div>

            {/* Seat Capacity Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#334155', marginBottom: '5px' }}>
                <span>Occupancy: <strong>{primaryArrival.occupancy_count} / {primaryArrival.capacity}</strong> seats</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>{primaryArrival.available_seats} free seats left</span>
              </div>
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (primaryArrival.occupancy_count / primaryArrival.capacity) * 100)}%`,
                    backgroundColor: getMeterColor(primaryArrival.occupancy_category),
                    height: '100%',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>

            {/* Boarding Intent Button (FR-08) */}
            <div>
              <button
                disabled={hasCheckedIn}
                onClick={() => onCheckIn(selectedStop.id)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  background: hasCheckedIn ? '#059669' : '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: hasCheckedIn ? 'default' : 'pointer',
                  boxShadow: hasCheckedIn
                    ? '0 4px 12px rgba(5, 150, 105, 0.35)'
                    : '0 4px 14px rgba(37, 99, 235, 0.35)'
                }}
              >
                {hasCheckedIn ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Boarding Intent Logged • You are in queue</span>
                  </>
                ) : (
                  <>
                    <Users size={16} />
                    <span>I Intend to Board This Shuttle</span>
                  </>
                )}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '7px', fontSize: '0.74rem', color: '#64748b' }}>
                <span>Signals office to deploy spare buses</span>
                {arrivalsData?.queue_demand !== undefined && (
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>
                    👥 {arrivalsData.queue_demand} students waiting
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="light-card" style={{ padding: '24px', textAlign: 'center', color: '#64748b', marginBottom: '16px' }}>
            <AlertCircle size={28} style={{ margin: '0 auto 8px', color: '#d97706' }} />
            <p style={{ fontSize: '0.86rem' }}>No active shuttles currently approaching this stop.</p>
          </div>
        )}

        {/* Card 3: Alternative Shuttle (If Available) */}
        {alternateArrival && (
          <div className="light-card" style={{ padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {primaryArrival?.occupancy_category === 'Full' ? '⚠️ Recommended Alternative' : 'Subsequent Shuttle'}
              </span>
              {altBadge && (
                <span style={{
                  background: altBadge.bg,
                  color: altBadge.color,
                  border: `1px solid ${altBadge.border}`,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  {alternateArrival.occupancy_category}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  {alternateArrival.vehicle_label}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  📍 {alternateArrival.distance_formatted} • {alternateArrival.available_seats} seats free
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>
                  {alternateArrival.eta_formatted}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {alternateArrival.is_stale ? 'GPS stale' : 'on track'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Quick Action - Scan QR / V-TOP Pass */}
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <QrCode size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#065f46' }}>
                Boarding? Pay ₹20 or Issue Pass
              </div>
              <div style={{ fontSize: '0.72rem', color: '#047857' }}>
                V-TOP Single-Use Dynamic Metro Pass
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateToStep && onNavigateToStep()}
            style={{
              padding: '7px 12px',
              background: '#059669',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>Passes & Dues</span>
            <ArrowRight size={13} />
          </button>
        </div>

      </div>

      {/* Right Column: Campus Interactive Map */}
      <div className="student-map-col">
        <CampusMap
          stops={stops}
          vehicles={vehicles}
          selectedStopId={selectedStopId}
          onSelectStop={onSelectStop}
        />
      </div>

      {/* Full Hostel Directory Modal (Light Mode) */}
      {showFullDirectory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '620px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={18} color="#2563eb" />
                <span>VIT Vellore Official Hostel Directory</span>
              </div>
              <button
                onClick={() => setShowFullDirectory(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search block code, name, or phone (e.g. MH Q, Kalam, LH A, 2548)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '0.84rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {filteredBlocks.map((blk) => (
                <div key={blk.code} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem'
                }}>
                  <div>
                    <strong style={{ color: '#1d4ed8' }}>{blk.code}</strong> — <span style={{ color: '#0f172a' }}>{blk.name}</span>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      {blk.clusterName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a href={`tel:${blk.phone.replace(/\s+/g, '')}`} style={{ color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                      <Phone size={12} /> {blk.phone}
                    </a>
                    {blk.email && (
                      <a href={`mailto:${blk.email}`} style={{ color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                onClick={() => setShowFullDirectory(false)}
                style={{
                  padding: '8px 16px',
                  background: '#2563eb',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
