import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function CampusMap({ stops, vehicles, selectedStopId, onSelectStop }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const stopMarkersRef = useRef({});
  const busMarkersRef = useRef({});
  const polylineGlowRef = useRef(null);
  const polylineMainRef = useRef(null);

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Centered on VIT Vellore Campus
    const vitVelloreCenter = [12.9720, 79.1610];

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: vitVelloreCenter,
        zoom: 16,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap | VIT Vellore Shuttle Grid',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if container unmounts
    };
  }, []);

  // Station Category & Meta Helper
  const getStationMeta = (id, name, idx) => {
    if (id.includes('gate')) {
      return {
        label: 'Gate 1 (Main Entrance)',
        short: 'Main Gate 1',
        icon: '⛩️',
        category: 'gate',
        accent: '#f59e0b',
        bg: '#78350f',
        tag: 'Campus Gate'
      };
    }
    if (id.includes('mb')) {
      return {
        label: 'MGR Block & Library',
        short: 'MGR Library',
        icon: '📚',
        category: 'academic',
        accent: '#06b6d4',
        bg: '#164e63',
        tag: 'Academic & Library'
      };
    }
    if (id.includes('tt')) {
      return {
        label: 'Tech Tower (TT Block)',
        short: 'TT Academic',
        icon: '🎓',
        category: 'academic',
        accent: '#06b6d4',
        bg: '#164e63',
        tag: 'Academic Block'
      };
    }
    if (id.includes('sjt')) {
      return {
        label: 'Silver Jubilee Tower',
        short: 'SJT Block',
        icon: '🏛️',
        category: 'academic',
        accent: '#8b5cf6',
        bg: '#4c1d95',
        tag: 'Academic Block'
      };
    }
    if (id.includes('lh-abcdef')) {
      return {
        label: 'LH A-F Food Park',
        short: 'LH A-F Food Park',
        icon: '🌸',
        category: 'ladies_hostel',
        accent: '#ec4899',
        bg: '#831843',
        tag: 'Ladies Hostels'
      };
    }
    if (id.includes('lh-ghj')) {
      return {
        label: 'LH G-J & RGT Towers',
        short: 'LH G-J Towers',
        icon: '🌸',
        category: 'ladies_hostel',
        accent: '#ec4899',
        bg: '#831843',
        tag: 'Ladies Hostels'
      };
    }
    if (id.includes('mh-qrst')) {
      return {
        label: 'MH Q-T (Kalam/Vajpayee)',
        short: 'MH Q-T Kalam',
        icon: '🏢',
        category: 'mens_hostel',
        accent: '#3b82f6',
        bg: '#1e3a8a',
        tag: 'Hostel Zone'
      };
    }
    if (id.includes('mh-ghjkl')) {
      return {
        label: 'MH G-L (Darling Mess)',
        short: 'MH G-L Darling',
        icon: '🏢',
        category: 'mens_hostel',
        accent: '#3b82f6',
        bg: '#1e3a8a',
        tag: 'Hostel Zone'
      };
    }
    if (id.includes('mh-mnp')) {
      return {
        label: 'MH M-P Quad (Darwin)',
        short: 'MH M-P Quad',
        icon: '🏢',
        category: 'mens_hostel',
        accent: '#3b82f6',
        bg: '#1e3a8a',
        tag: 'Hostel Zone'
      };
    }
    if (id.includes('mh-abcdef')) {
      return {
        label: 'MH A-F (Einstein/Raman)',
        short: 'MH A-F Einstein',
        icon: '🏢',
        category: 'mens_hostel',
        accent: '#3b82f6',
        bg: '#1e3a8a',
        tag: 'Hostel Zone'
      };
    }
    return {
      label: name.split('(')[0].trim() || `Station ${idx + 1}`,
      short: `Stop ${idx + 1}`,
      icon: '🚏',
      category: 'station',
      accent: '#64748b',
      bg: '#1e293b',
      tag: 'Campus Stop'
    };
  };

  // Render & Update Transit Route Polyline + Distinct Station Pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !stops || stops.length === 0) return;

    // Smooth Transit Loop Polyline
    const latLngs = stops.map(s => [s.latitude, s.longitude]);
    if (stops.length > 2) {
      latLngs.push([stops[0].latitude, stops[0].longitude]);
    }

    if (polylineGlowRef.current) {
      polylineGlowRef.current.setLatLngs(latLngs);
      polylineMainRef.current?.setLatLngs(latLngs);
    } else {
      // Glow background line
      polylineGlowRef.current = L.polyline(latLngs, {
        color: '#0284c7',
        weight: 8,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Crisp transit loop line
      polylineMainRef.current = L.polyline(latLngs, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    }

    // Render Distinct Transit Station Totems (Not clumsy numbered dots!)
    stops.forEach((stop, idx) => {
      const isSelected = stop.id === selectedStopId;
      const markerKey = `stop-${stop.id}`;
      const meta = getStationMeta(stop.id, stop.name, idx);

      const stationHtml = `
        <div class="transit-station-pin ${isSelected ? 'is-selected' : ''}" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          user-select: none;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        ">
          <!-- Floating Station Badge (Light Mode) -->
          <div style="
            background: ${isSelected ? '#2563eb' : '#ffffff'};
            border: ${isSelected ? '2px solid #1d4ed8' : `1.5px solid ${meta.accent}`};
            color: ${isSelected ? '#ffffff' : '#0f172a'};
            padding: ${isSelected ? '5px 10px' : '3px 8px'};
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            box-shadow: ${isSelected ? '0 0 0 4px rgba(37, 99, 235, 0.25), 0 4px 14px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.12)'};
            transform: ${isSelected ? 'scale(1.08)' : 'scale(1)'};
            font-family: var(--font-sans, sans-serif);
          ">
            <span style="font-size: ${isSelected ? '14px' : '12px'};">${meta.icon}</span>
            <div style="display: flex; flex-direction: column; line-height: 1.15;">
              <span style="font-size: ${isSelected ? '12px' : '11px'}; font-weight: 800; letter-spacing: -0.01em; color: ${isSelected ? '#ffffff' : '#0f172a'};">
                ${meta.short}
              </span>
              ${isSelected ? `
                <span style="font-size: 8.5px; color: #bfdbfe; font-weight: 700; text-transform: uppercase;">
                  ● Selected Pickup
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Vertical Totem Stem & Ground Road Beacon -->
          <div style="
            width: 2px;
            height: 10px;
            background: ${isSelected ? '#93c5fd' : meta.accent};
            opacity: 0.8;
          "></div>
          <div style="
            width: ${isSelected ? '14px' : '9px'};
            height: ${isSelected ? '14px' : '9px'};
            border-radius: 50%;
            background: ${isSelected ? '#3b82f6' : meta.accent};
            border: 2px solid #ffffff;
            box-shadow: ${isSelected ? '0 0 12px #3b82f6' : '0 2px 6px rgba(0,0,0,0.5)'};
            transition: all 0.25s ease;
          "></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-station-totem-icon',
        html: stationHtml,
        iconSize: [isSelected ? 160 : 130, isSelected ? 65 : 50],
        iconAnchor: [isSelected ? 80 : 65, isSelected ? 58 : 45]
      });

      if (stopMarkersRef.current[markerKey]) {
        stopMarkersRef.current[markerKey].setIcon(customIcon);
        stopMarkersRef.current[markerKey].setLatLng([stop.latitude, stop.longitude]);
      } else {
        const marker = L.marker([stop.latitude, stop.longitude], {
          icon: customIcon,
          zIndexOffset: isSelected ? 500 : 100
        }).addTo(map);

        marker.on('click', () => {
          if (onSelectStop) onSelectStop(stop.id);
        });

        stopMarkersRef.current[markerKey] = marker;
      }
    });
  }, [stops, selectedStopId]);

  // Clean short vehicle names
  const getBusShortLabel = (label) => {
    if (!label) return 'Bus';
    if (label.includes('101') || label.includes('Q-R-S-T')) return 'Bus 101';
    if (label.includes('102') || label.includes('Ladies')) return 'Bus 102';
    if (label.includes('103') || label.includes('SJT')) return 'Bus 103';
    if (label.includes('104') || label.includes('Spare')) return 'Spare 104';
    return label.split('(')[0].trim();
  };

  // Render & Smoothly Glide Moving Shuttles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !vehicles) return;

    vehicles.forEach((veh) => {
      const markerKey = `veh-${veh.trip_id || veh.vehicle_id}`;
      const isStale = veh.is_stale;
      const isFull = veh.crowd_category === 'Full';
      const isOffDuty = veh.is_driver_on_duty === false;
      const busLabel = getBusShortLabel(veh.vehicle_label);

      let busBg = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
      let busBorder = '#60a5fa';
      if (veh.vehicle_label?.includes("Ladies") || veh.vehicle_label?.includes("LH")) {
        busBg = 'linear-gradient(135deg, #db2777 0%, #be185d 100%)';
        busBorder = '#f472b6';
      } else if (veh.vehicle_label?.includes("Q-R-S-T") || veh.vehicle_label?.includes("MH")) {
        busBg = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
        busBorder = '#38bdf8';
      } else if (veh.vehicle_label?.includes("SJT") || veh.vehicle_label?.includes("Academic")) {
        busBg = 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)';
        busBorder = '#a78bfa';
      }
      if (isFull) {
        busBg = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
        busBorder = '#f87171';
      }
      if (isStale) {
        busBg = 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)';
        busBorder = '#f472b6';
      }
      if (isOffDuty) {
        busBg = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
        busBorder = '#94a3b8';
      }

      const busHtml = `
        <div class="live-shuttle-capsule" style="
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        ">
          <!-- Aerodynamic Horizontal Bus Capsule -->
          <div style="
            background: ${busBg};
            border: 2px solid ${busBorder};
            color: #ffffff;
            padding: 4px 10px;
            border-radius: 24px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
          ">
            <span style="font-size: 13px;">🚌</span>
            <span style="letter-spacing: -0.01em;">${busLabel}</span>
            <span class="bus-occ-badge" style="
              background: rgba(0, 0, 0, 0.4);
              padding: 1px 6px;
              border-radius: 12px;
              font-size: 9.5px;
              font-weight: 700;
              border: 1px solid rgba(255, 255, 255, 0.15);
            ">${veh.occupancy || 0}/${veh.capacity || 40}</span>
          </div>

          ${isOffDuty ? `
            <div style="
              font-size: 8px;
              background: #ef4444;
              color: white;
              padding: 1px 6px;
              border-radius: 4px;
              font-weight: 800;
              margin-top: 2px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            ">
              STANDBY (OFF-DUTY)
            </div>
          ` : `
            <div style="
              width: 6px;
              height: 6px;
              border-radius: 50%;
              background: #10b981;
              box-shadow: 0 0 6px #10b981;
              margin-top: 2px;
            "></div>
          `}
        </div>
      `;

      const busIcon = L.divIcon({
        className: 'custom-vit-bus-marker',
        html: busHtml,
        iconSize: [120, 44],
        iconAnchor: [60, 22]
      });

      const structuralState = `${busBg}_${isOffDuty}_${isFull}_${isStale}`;

      if (busMarkersRef.current[markerKey]) {
        const marker = busMarkersRef.current[markerKey];
        // Smoothly glide position to new LatLng (hardware-accelerated via CSS transition)
        marker.setLatLng([veh.latitude, veh.longitude]);

        // If core styling changed (e.g. went off duty or full), update icon
        if (marker._structuralState !== structuralState) {
          marker.setIcon(busIcon);
          marker._structuralState = structuralState;
        } else {
          // If only occupancy number changed, update inner text without destroying DOM element!
          const occEl = marker.getElement()?.querySelector('.bus-occ-badge');
          if (occEl) {
            occEl.textContent = `${veh.occupancy || 0}/${veh.capacity || 40}`;
          }
        }
      } else {
        const marker = L.marker([veh.latitude, veh.longitude], {
          icon: busIcon,
          zIndexOffset: 1000
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 6px; min-width: 190px;">
            <strong style="color: #1e3a8a; font-size: 13px;">🚌 ${veh.vehicle_label || 'VIT Shuttle'}</strong>
            <div style="margin: 6px 0; padding: 6px 8px; background: #f8fafc; border-radius: 6px; font-size: 11px; border: 1px solid #e2e8f0;">
              <b>Driver:</b> ${veh.driver_name || 'Rajesh Kumar'}<br>
              <b>Status:</b> ${isOffDuty ? '<span style="color:#ef4444;font-weight:700;">OFF-DUTY (Standby)</span>' : '<span style="color:#10b981;font-weight:700;">ON-DUTY (Live GPS)</span>'}<br>
              <b>Speed:</b> ${veh.speed_mps ? Math.round(veh.speed_mps * 3.6) : 20} km/h
            </div>
            <div style="font-size: 11px; color: #475569;">
              <b>Occupancy:</b> ${veh.occupancy || 0} / ${veh.capacity || 40} seats
            </div>
          </div>
        `);

        marker._structuralState = structuralState;
        busMarkersRef.current[markerKey] = marker;
      }
    });
  }, [vehicles]);

  return (
    <div className="map-container-wrap" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Visual Map Legend (Light Mode) */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 500,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.72rem',
        color: '#0f172a',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        pointerEvents: 'none',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🏢</span>
          <span style={{ color: '#1d4ed8' }}>Men's Hostels</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🌸</span>
          <span style={{ color: '#be185d' }}>Ladies Hostels</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🎓</span>
          <span style={{ color: '#0369a1' }}>Academic</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>🚌</span>
          <span style={{ color: '#047857' }}>Live Shuttles</span>
        </div>
      </div>

      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
