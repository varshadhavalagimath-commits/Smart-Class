import React from 'react';
import { 
  Bot, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  Zap, 
  Heart, 
  ShieldCheck, 
  Award,
  ChevronRight
} from 'lucide-react';

export default function AgentCard({ decision }) {
  if (!decision) {
    return (
      <div className="card">
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
          No agent decision recorded yet. Start simulation or apply manual inputs.
        </div>
      </div>
    );
  }

  const {
    agent_name,
    agent_type,
    selected_state,
    power_w,
    comfort_score,
    energy_efficiency_score,
    operational_compliance_score,
    utility_score,
    reason,
    matched_rule,
    internal_state,
    goals_status,
    utility_breakdown,
    active_fan_count = 0,
    fan_power_w = 0,
    zone_fan_allocations,
    zone_reasons
  } = decision;

  return (
    <div className="card">
      <div className="card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={18} color="var(--primary-blue)" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
              {agent_name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Architecture: {agent_type}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-blue">
            Power: {power_w} W
          </span>
          <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
            Utility: {utility_score.toFixed(1)} / 100
          </span>
        </div>
      </div>

      {/* Decision Scores Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        padding: '0.85rem',
        backgroundColor: 'var(--bg-subtle)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Comfort */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <Heart size={12} color="#ef4444" />
            <span>Comfort (45%)</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: comfort_score > 80 ? '#059669' : comfort_score > 50 ? '#d97706' : '#dc2626' }}>
            {comfort_score.toFixed(1)}
          </div>
        </div>

        {/* Energy Efficiency */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <Zap size={12} color="#10b981" />
            <span>Efficiency (40%)</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>
            {energy_efficiency_score.toFixed(1)}
          </div>
        </div>

        {/* Compliance */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <ShieldCheck size={12} color="#2563eb" />
            <span>Compliance (15%)</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: operational_compliance_score > 80 ? '#2563eb' : '#d97706' }}>
            {operational_compliance_score.toFixed(1)}
          </div>
        </div>

        {/* Total Rational Utility */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <Award size={12} color="#8b5cf6" />
            <span>Total Utility</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
            {utility_score.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Primary Reason / Justification Box */}
      <div style={{
        padding: '0.85rem 1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        marginBottom: '1rem'
      }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
          Decision Justification:
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--primary-navy)', lineHeight: 1.45, fontWeight: 500 }}>
          {reason}
        </p>
      </div>

      {/* Dynamic Zone Fan Breakdown */}
      {zone_fan_allocations && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 0.9rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          border: '1px solid #bbf7d0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
              💨 Zone-Based Fan Actuation ({active_fan_count}/8 Active • {fan_power_w} W):
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {Object.entries(zone_fan_allocations).map(([zId, activeFans]) => (
              <div
                key={zId}
                style={{
                  padding: '0.45rem 0.6rem',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #dcfce7',
                  fontSize: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <strong style={{ color: 'var(--primary-navy)' }}>{zId}</strong>
                  <span className={`badge ${activeFans && activeFans.length > 0 ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                    {activeFans && activeFans.length > 0 ? `${activeFans.length} ON (${activeFans.map(f => `F${f}`).join(', ')})` : 'Fans OFF'}
                  </span>
                </div>
                {zone_reasons && zone_reasons[zId] && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {zone_reasons[zId]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architecture Specific Technical View */}
      {/* 1. Simple Reflex Rules View */}
      {matched_rule && agent_type === 'simple_reflex' && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--primary-navy)' }}>Condition-Action Rules Triggered:</strong>
          <pre style={{
            marginTop: '0.35rem',
            padding: '0.6rem 0.8rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            whiteSpace: 'pre-wrap'
          }}>
            {matched_rule}
          </pre>
        </div>
      )}

      {/* 2. Model-Based Internal State View */}
      {internal_state && agent_type === 'model_based' && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe',
          fontSize: '0.78rem'
        }}>
          <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: '0.4rem' }}>
            🧠 Model-Based Internal State Beliefs:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.5rem', color: '#1e3a8a' }}>
            <div>Belief: <strong>{internal_state.internal_occupancy_belief}</strong></div>
            <div>Temp (Raw / Smoothed): <strong>{internal_state.raw_temperature_c}°C / {internal_state.smoothed_temperature_c}°C</strong></div>
            <div>Light (Raw / Smoothed): <strong>{internal_state.raw_lux} / {internal_state.smoothed_lux} lux</strong></div>
            <div>Thermal Trend: <strong>{internal_state.temperature_trend}</strong></div>
            <div>Streak Zeros: <strong>{internal_state.occupancy_streak_zeros}</strong></div>
            <div>Glitch Filtered: <strong>{internal_state.sensor_glitch_filtered ? 'YES (Occlusion filtered)' : 'No'}</strong></div>
          </div>
        </div>
      )}

      {/* 3. Goal-Based Objectives View */}
      {goals_status && agent_type === 'goal_based' && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            🎯 Operational Goals Evaluated:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {goals_status.map((goal, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.45rem 0.65rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '6px',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={14} color="#10b981" />
                  <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>{goal.goal_name}</span>
                </div>
                <span className="badge badge-green">Satisfied</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Utility-Based Candidate Combinations View */}
      {utility_breakdown && agent_type === 'utility_based' && (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
            📊 Candidate Device States Evaluated (2³ = 8 Combinations):
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ fontSize: '0.75rem' }}>
              <thead>
                <tr>
                  <th>Lights</th>
                  <th>Fans</th>
                  <th>Projector</th>
                  <th>Power</th>
                  <th>Comfort</th>
                  <th>Efficiency</th>
                  <th>Compliance</th>
                  <th>Utility (U)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {utility_breakdown.map((item, idx) => (
                  <tr key={idx} style={{ backgroundColor: item.is_chosen ? '#ecfdf5' : 'transparent', fontWeight: item.is_chosen ? 700 : 400 }}>
                    <td>{item.lights ? 'ON' : 'OFF'}</td>
                    <td>{item.fans ? 'ON' : 'OFF'}</td>
                    <td>{item.projector ? 'ON' : 'OFF'}</td>
                    <td>{item.power_w} W</td>
                    <td>{item.comfort_score.toFixed(0)}</td>
                    <td>{item.energy_score.toFixed(0)}</td>
                    <td>{item.compliance_score.toFixed(0)}</td>
                    <td style={{ color: item.is_chosen ? '#059669' : 'inherit' }}>{item.utility_score.toFixed(2)}</td>
                    <td>
                      {item.is_chosen ? (
                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>OPTIMAL</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
