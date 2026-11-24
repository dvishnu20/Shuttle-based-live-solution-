import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import StudentPortal from './components/StudentPortal';
import DriverConsole from './components/DriverConsole';



const API_BASE = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws/live';

export default function App() {
  const [currentUser, setCurrentUser] = useState({
    role: 'student',
    name: 'Aarav Sharma',
    id: '22BCE1042',
    department: 'B.Tech CSE (MH Q-412)',
    email: 'aarav.sharma2022@vitstudent.ac.in'
  });
  const [activeRole, setActiveRole] = useState('student');
  const [activeScenario, setActiveScenario] = useState('normal');
  const [speed, setSpeed] = useState(1.0);
  const [wsConnected, setWsConnected] = useState(false);

  const [stops, setStops] = useState([]);
  const [selectedStopId, setSelectedStopId] = useState('stop-vit-mh-qrst');

  const [arrivalsData, setArrivalsData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [demandSummary, setDemandSummary] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);

  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [toasts, setToasts] = useState([]);
  const wsRef = useRef(null);

  const lastArrivalsFetchRef = useRef(0);

  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Initial Fetch: Stops
  useEffect(() => {
    fetch(`${API_BASE}/api/stops`)
      .then((res) => res.json())
      .then((data) => {
        setStops(data);
        if (data.length > 0) {
          const exists = data.some(s => s.id === selectedStopId);
          if (!exists) {
            setSelectedStopId(data[0].id);
          }
        }
      })
      .catch((err) => console.error('Error fetching stops:', err));
  }, []);


  // Fetch Arrivals for Selected Stop
  const fetchArrivals = (stopId) => {
    if (!stopId) return;
    fetch(`${API_BASE}/api/stops/${stopId}/arrivals`)
      .then((res) => res.json())
      .then((data) => setArrivalsData(data))
      .catch((err) => console.error('Error fetching arrivals:', err));
  };

  useEffect(() => {
    fetchArrivals(selectedStopId);
  }, [selectedStopId]);

  // Fetch Admin Data
  const fetchAdminData = () => {
    fetch(`${API_BASE}/api/admin/demand`, { headers: { role: 'admin' } })
      .then((res) => res.json())
      .then((data) => setDemandSummary(data))
      .catch((err) => console.error('Error fetching demand:', err));

    fetch(`${API_BASE}/api/admin/recommendations`, { headers: { role: 'admin' } })
      .then((res) => res.json())
      .then((data) => setRecommendations(data))
      .catch((err) => console.error('Error fetching recommendations:', err));

    fetch(`${API_BASE}/api/admin/audit-logs`, { headers: { role: 'admin' } })
      .then((res) => res.json())
      .then((data) => setAuditLogs(data))
      .catch((err) => console.error('Error fetching audit logs:', err));

    fetch(`${API_BASE}/api/analytics`)
      .then((res) => res.json())
      .then((data) => setAnalyticsData(data))
      .catch((err) => console.error('Error fetching analytics:', err));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // WebSocket Connection for Live Streaming (FR-02, FR-04, WS/live)
  useEffect(() => {
    let socket;
    let pingInterval;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(WS_URL);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
          pingInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'PING' }));
            }
          }, 15000);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'LIVE_TICK') {
              if (data.vehicles) {
                setVehicles(data.vehicles);
              }
              // Throttle arrivals fetch to prevent continuous DOM churn
              const now = Date.now();
              if (now - lastArrivalsFetchRef.current > 3500) {
                lastArrivalsFetchRef.current = now;
                fetchArrivals(selectedStopId);
              }
            } else if (data.type === 'OCCUPANCY_UPDATE') {
              fetchArrivals(selectedStopId);
              fetchAdminData();
              if (data.crowd_category === 'Full') {
                addToast(`⚠️ Shuttle reached capacity (Full 100%)! Offering next alternative.`, 'warning');
              }
            } else if (data.type === 'DEMAND_UPDATE') {
              fetchArrivals(selectedStopId);
              fetchAdminData();
            } else if (data.type === 'RECOMMENDATION_ACTIONED') {
              fetchAdminData();
              addToast(`Dispatch recommendation for ${data.stop_name} marked ${data.status}!`, 'success');
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          clearInterval(pingInterval);
          // Try reconnect after 3s
          setTimeout(connectWebSocket, 3000);
        };

        socket.onerror = () => {
          setWsConnected(false);
        };
      } catch (e) {
        setWsConnected(false);
      }
    };

    connectWebSocket();

    // Secondary Polling interval (Every 3.5s) to guarantee freshness
    const pollInterval = setInterval(() => {
      fetchArrivals(selectedStopId);
      if (activeRole === 'admin' || activeRole === 'analytics') {
        fetchAdminData();
      }
    }, 3500);

    return () => {
      clearInterval(pollInterval);
      clearInterval(pingInterval);
      if (socket) socket.close();
    };
  }, [selectedStopId, activeRole]);

  // Handler: Change Scenario
  const handleSelectScenario = async (scenario) => {
    setActiveScenario(scenario);
    try {
      const res = await fetch(`${API_BASE}/api/simulation/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, speed })
      });
      const data = await res.json();
      addToast(`Activated Scenario: ${scenario}`, 'info');
      fetchArrivals(selectedStopId);
      fetchAdminData();
    } catch (err) {
      console.error('Error setting scenario:', err);
    }
  };

  // Handler: Change Speed
  const handleChangeSpeed = async (newSpeed) => {
    setSpeed(newSpeed);
    try {
      await fetch(`${API_BASE}/api/simulation/start?speed=${newSpeed}`, { method: 'POST' });
      addToast(`Simulator speed set to ${newSpeed}x`, 'info');
    } catch (err) {
      console.error('Error setting speed:', err);
    }
  };

  // Handler: Student Opt-In Intent Check-In (FR-08)
  const handleCheckIn = async (stopId) => {
    const sessionId = `session_${Math.random().toString(36).substring(2, 9)}`;
    try {
      const res = await fetch(`${API_BASE}/api/intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stop_id: stopId,
          session_id: sessionId,
          window_minutes: 15
        })
      });
      if (res.ok) {
        setHasCheckedIn(true);
        addToast(`Check-in confirmed! You are queued for this shuttle window.`, 'success');
        fetchArrivals(stopId);
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error recording intent:', err);
    }
  };

  // Handler: Admin Recommendation Action (Accept / Reject)
  const handleActionRecommendation = async (recommendationId, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/recommendations/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          role: 'admin'
        },
        body: JSON.stringify({
          recommendation_id: recommendationId,
          action,
          reason: action === 'accept' ? 'Peak hour demand surge verified' : 'Dismissed by transport operator'
        })
      });
      if (res.ok) {
        addToast(`Recommendation #${recommendationId} ${action}ed!`, 'success');
        fetchAdminData();
        fetchArrivals(selectedStopId);
      }
    } catch (err) {
      console.error('Error actioning recommendation:', err);
    }
  };

  // Handler: Driver Occupancy Update
  const handleUpdateOccupancy = async (updateData) => {
    const res = await fetch(`${API_BASE}/api/driver/occupancy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        role: 'driver'
      },
      body: JSON.stringify(updateData)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update occupancy');
    }
    const data = await res.json();
    addToast(`Occupancy updated to ${data.current_occupancy} passengers`, 'info');
    fetchArrivals(selectedStopId);
    return data;
  };

  // Handler: Driver Start Trip
  const handleStartTrip = async (vehicleId) => {
    try {
      const res = await fetch(`${API_BASE}/api/driver/trips/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', role: 'driver' },
        body: JSON.stringify({
          route_id: 'route-1',
          vehicle_id: vehicleId,
          driver_id: 'driver_1'
        })
      });
      if (res.ok) {
        addToast(`Trip started for ${vehicleId}`, 'success');
        fetchArrivals(selectedStopId);
      }
    } catch (err) {
      console.error('Error starting trip:', err);
    }
  };

  // Handler: Driver End Trip
  const handleEndTrip = async (tripId) => {
    try {
      const res = await fetch(`${API_BASE}/api/driver/trips/${tripId}/end`, {
        method: 'POST',
        headers: { role: 'driver' }
      });
      if (res.ok) {
        addToast(`Trip completed!`, 'info');
        fetchArrivals(selectedStopId);
      }
    } catch (err) {
      console.error('Error ending trip:', err);
    }
  };

  // If not logged in, display the clean university login portal
  if (!currentUser) {
    return (
      <div className="app-container light-mode-root">
        <LoginPage
          onLogin={(user) => {
            setCurrentUser(user);
            setActiveRole(user.role);
            addToast(`Welcome back, ${user.name}! Accessing ${user.role === 'driver' ? 'Driver Terminal' : 'Student Portal'}.`, 'success');
          }}
        />
        {/* Real-time Toast Notifications */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className="toast">
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container light-mode-root">
      {/* Light Mode Executive Header with Portal Switcher & Scenario Studio */}
      <Navbar
        currentUser={currentUser}
        activeRole={activeRole}
        onChangeRole={setActiveRole}
        onLogout={() => {
          setCurrentUser(null);
          addToast('Logged out of session.', 'info');
        }}
        wsConnected={wsConnected}
        activeScenario={activeScenario}
        onSelectScenario={handleSelectScenario}
        speed={speed}
        onChangeSpeed={handleChangeSpeed}
      />

      {/* Main Content Area: Exactly Two Core Components (Student Portal or Driver Console) */}
      <main className="main-view-layout">
        {activeRole === 'student' && (
          <StudentPortal
            stops={stops}
            selectedStopId={selectedStopId}
            onSelectStop={setSelectedStopId}
            arrivalsData={arrivalsData}
            vehicles={vehicles}
            onCheckIn={handleCheckIn}
            hasCheckedIn={hasCheckedIn}
            onToast={addToast}
            currentUser={currentUser}
          />
        )}

        {activeRole === 'driver' && (
          <DriverConsole
            vehicles={vehicles}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
            onUpdateOccupancy={handleUpdateOccupancy}
            onToast={addToast}
            onNavigateToStep={setActiveRole}
          />
        )}
      </main>

      {/* Real-time Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
