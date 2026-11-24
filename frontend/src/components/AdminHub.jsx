import React from 'react';
import { ShieldCheck, Users, Bus, AlertCircle, Check, X, Clock, FileText, ArrowLeft, ArrowRight } from 'lucide-react';

export default function AdminHub({
  demandSummary,
  recommendations,
  auditLogs,
  vehicles,
  onActionRecommendation,
  onNavigateToStep
}) {
  const activeRecommendation = recommendations?.find(r => r.status === 'pending');

  return (
    <div className="admin-dashboard">
      {/* Active AI Dispatch Recommendation Banner (FR-11, T06, T07) */}
      {activeRecommendation ? (
        <div className="recommendation-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="rec-badge">
              ⚡ AI Dispatch Advisory • Demand Mismatch Detected
            </span>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              Window: <strong>{activeRecommendation.window}</strong>
            </span>
          </div>

          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '8px 0', color: '#fff' }}>
            Actionable Recommendation for {activeRecommendation.stop_name}
          </h3>

          <p className="rec-rationale">
            {activeRecommendation.suggestion}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            background: 'rgba(0,0,0,0.25)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '0.84rem'
          }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Expected Demand:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>
                {activeRecommendation.demand} riders
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Free Capacity:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
                {activeRecommendation.free_capacity} seats
              </div>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Capacity Shortfall:</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>
                {activeRecommendation.shortfall} riders
              </div>
            </div>
          </div>

          <div className="rec-actions">
            {activeRecommendation.suggested_vehicle_id ? (
              <button
                className="btn-approve"
                onClick={() => onActionRecommendation(activeRecommendation.id, 'accept')}
              >
                <Check size={16} />
                <span>Approve & Dispatch Spare Shuttle ({activeRecommendation.suggested_vehicle_label || 'Bus 3'})</span>
              </button>
            ) : (
              <div style={{ color: '#f87171', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>Zero spare shuttles in depot. Unmet demand flagged without false dispatch.</span>
              </div>
            )}

            <button
              className="btn-dismiss"
              onClick={() => onActionRecommendation(activeRecommendation.id, 'reject')}
            >
              <X size={16} />
              <span>Dismiss Recommendation</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <ShieldCheck size={24} color="#10b981" />
          <div>
            <div style={{ fontWeight: 700, color: '#fff' }}>Fleet Capacity In Equilibrium</div>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No severe capacity shortfalls currently detected across campus stops.</div>
          </div>
        </div>
      )}

      {/* Real-time Stop Demand vs Supply Gap Grid */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Users size={18} color="#38bdf8" />
        <span>Stop Demand vs Scheduled Free Capacity</span>
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {demandSummary?.map((d) => (
          <div key={d.stop_id} className="metric-card" style={{
            borderLeft: d.shortfall > 0 ? '4px solid #ef4444' : '4px solid #10b981'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff' }}>{d.stop_name}</div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: d.shortfall > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: d.shortfall > 0 ? '#ef4444' : '#10b981'
              }}>
                {d.shortfall > 0 ? `Shortfall: ${d.shortfall}` : 'Sufficient'}
              </span>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '12px' }}>
              Departure Window: {d.window}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Expected Riders:</span>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f59e0b' }}>
                  {d.total_expected_demand}
                </div>
                <small style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  ({d.confirmed_intents} opt-in intents)
                </small>
              </div>

              <div>
                <span style={{ color: '#64748b' }}>Arriving Free Seats:</span>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#38bdf8' }}>
                  {d.scheduled_free_capacity}
                </div>
                <small style={{ color: '#64748b', fontSize: '0.7rem' }}>
                  across approaching buses
                </small>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fleet Status Table */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bus size={18} color="#6366f1" />
        <span>Campus Fleet Overview</span>
      </h3>

      <div className="glass-panel" style={{ overflowX: 'auto', marginBottom: '28px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 18px' }}>Vehicle Label</th>
              <th style={{ padding: '14px 18px' }}>Capacity</th>
              <th style={{ padding: '14px 18px' }}>Status</th>
              <th style={{ padding: '14px 18px' }}>Current Occupancy</th>
              <th style={{ padding: '14px 18px' }}>GPS Freshness</th>
            </tr>
          </thead>
          <tbody>
            {vehicles?.map((veh) => (
              <tr key={veh.vehicle_id || veh.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#fff' }}>
                  {veh.vehicle_label || veh.label}
                </td>
                <td style={{ padding: '14px 18px' }}>{veh.capacity || 40} seats</td>
                <td style={{ padding: '14px 18px' }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: veh.is_stale ? 'rgba(236, 72, 153, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: veh.is_stale ? '#ec4899' : '#10b981'
                  }}>
                    {veh.is_stale ? 'STALE GPS' : 'ACTIVE / IN ROUTE'}
                  </span>
                </td>
                <td style={{ padding: '14px 18px' }}>
                  {veh.occupancy !== undefined ? `${veh.occupancy} passengers (${veh.available_seats} free)` : 'Idle in depot'}
                </td>
                <td style={{ padding: '14px 18px', color: '#94a3b8' }}>
                  {veh.freshness_seconds !== undefined ? `${Math.round(veh.freshness_seconds)}s ago` : 'Standby'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Admin Audit Trail (FR-16) */}
      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FileText size={18} color="#a855f7" />
        <span>Admin Action Audit Trail (FR-16)</span>
      </h3>

      <div className="glass-panel" style={{ padding: '18px' }}>
        {auditLogs && auditLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                fontSize: '0.84rem'
              }}>
                <div>
                  <strong style={{ color: '#38bdf8' }}>[{log.action}]</strong> {log.details}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                  {log.actor} • {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No audit events recorded yet.</div>
        )}
      </div>

      {/* Page-Wise Workflow Step 4 Footer */}
      <div className="page-workflow-footer-card">
        <div className="workflow-footer-info">
          <span className="workflow-footer-subtitle">Workflow Step 4 Completed</span>
          <div className="workflow-footer-title">Fleet Demand Balanced & Spare Dispatch Verified</div>
          <p className="workflow-footer-desc">
            Peak crowd demand surge at MH High-Rise Towers was mitigated by accepting the AI dispatch advisory. The action was logged to the tamper-evident audit trail. Now review overall ETA prediction accuracy and analytics.
          </p>
        </div>
        <div className="workflow-footer-buttons">
          <button
            className="btn-workflow-nav btn-workflow-prev"
            onClick={() => onNavigateToStep && onNavigateToStep('driver')}
          >
            <ArrowLeft size={16} />
            <span>Step 3: Driver Console</span>
          </button>
          <button
            className="btn-workflow-nav btn-workflow-next"
            onClick={() => onNavigateToStep && onNavigateToStep('analytics')}
          >
            <span>Proceed to Step 5: Transit Performance Analytics</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
