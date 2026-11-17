import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  CheckCircle2, 
  Lightbulb, 
  Wind, 
  Video, 
  Zap, 
  Heart, 
  RotateCw,
  Sparkles,
  Layers,
  Brain,
  Target,
  Award
} from 'lucide-react';
import { api } from '../services/api';

export default function AgentComparisonPage({ state, onSelectAgent }) {
  const currentPercepts = state?.current_percepts;
  const activeAgent = state?.active_agent;

  const [testPercepts, setTestPercepts] = useState({
    students_count: 35,
    temperature: 24.0,
    light_intensity: 250.0,
    activity: 'Lecture',
    door_status: 'Closed',
    window_status: 'Closed',
    simulated_time: '10:00 AM',
    zones: {
      'Zone A': { zone_id: 'Zone A', name: 'Front Left', students_count: 15, teacher_present: true, fans: [1, 2], student_preference: 'no_preference', teacher_preference: 'no_preference' },
      'Zone B': { zone_id: 'Zone B', name: 'Front Right', students_count: 20, teacher_present: false, fans: [3, 4], student_preference: 'no_preference', teacher_preference: 'no_preference' },
      'Zone C': { zone_id: 'Zone C', name: 'Back Left', students_count: 0, teacher_present: false, fans: [5, 6], student_preference: 'no_preference', teacher_preference: 'no_preference' },
      'Zone D': { zone_id: 'Zone D', name: 'Back Right', students_count: 0, teacher_present: false, fans: [7, 8], student_preference: 'no_preference', teacher_preference: 'no_preference' },
    },
    teacher_zone: 'Zone A',
    teacher_preference: 'no_preference',
  });

  const [comparisons, setComparisons] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTabScenario, setActiveTabScenario] = useState('current');

  // Load comparisons from backend
  const runComparison = async (perceptsToUse) => {
    setIsLoading(true);
    try {
      const res = await api.compareAgents(perceptsToUse);
      if (res && res.comparisons) {
        setComparisons(res.comparisons);
      }
    } catch (err) {
      console.error('Failed to run comparison:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTabScenario === 'current' && currentPercepts) {
      setTestPercepts(currentPercepts);
      runComparison(currentPercepts);
    }
  }, [currentPercepts, activeTabScenario]);

  const handleScenarioChange = (scenario) => {
    setActiveTabScenario(scenario);
    let p = { ...testPercepts };

    if (scenario === 'current') {
      p = currentPercepts || p;
    } else if (scenario === 'hot_two_zones') {
      // Hot temp (32°C) with Zone A (15) and Zone B (10) occupied; C & D empty
      p = {
        ...p,
        students_count: 25,
        temperature: 32.0,
        light_intensity: 550.0,
        activity: 'Lecture',
        zones: {
          'Zone A': { zone_id: 'Zone A', name: 'Front Left', students_count: 15, teacher_present: true, fans: [1, 2], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone B': { zone_id: 'Zone B', name: 'Front Right', students_count: 10, teacher_present: false, fans: [3, 4], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone C': { zone_id: 'Zone C', name: 'Back Left', students_count: 0, teacher_present: false, fans: [5, 6], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone D': { zone_id: 'Zone D', name: 'Back Right', students_count: 0, teacher_present: false, fans: [7, 8], student_preference: 'no_preference', teacher_preference: 'no_preference' },
        },
        teacher_zone: 'Zone A',
        teacher_preference: 'no_preference',
      };
    } else if (scenario === 'hot_all_zones') {
      // Hot temp (32°C) with all 4 zones occupied
      p = {
        ...p,
        students_count: 42,
        temperature: 32.0,
        light_intensity: 600.0,
        activity: 'Lecture',
        zones: {
          'Zone A': { zone_id: 'Zone A', name: 'Front Left', students_count: 12, teacher_present: true, fans: [1, 2], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone B': { zone_id: 'Zone B', name: 'Front Right', students_count: 10, teacher_present: false, fans: [3, 4], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone C': { zone_id: 'Zone C', name: 'Back Left', students_count: 10, teacher_present: false, fans: [5, 6], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone D': { zone_id: 'Zone D', name: 'Back Right', students_count: 10, teacher_present: false, fans: [7, 8], student_preference: 'no_preference', teacher_preference: 'no_preference' },
        },
        teacher_zone: 'Zone A',
        teacher_preference: 'no_preference',
      };
    } else if (scenario === 'cold_student_req') {
      // Cold temp (20°C) with student fan request in Zone A
      p = {
        ...p,
        students_count: 10,
        temperature: 20.0,
        light_intensity: 350.0,
        activity: 'Lecture',
        zones: {
          'Zone A': { zone_id: 'Zone A', name: 'Front Left', students_count: 10, teacher_present: false, fans: [1, 2], student_preference: 'on', teacher_preference: 'no_preference' },
          'Zone B': { zone_id: 'Zone B', name: 'Front Right', students_count: 0, teacher_present: false, fans: [3, 4], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone C': { zone_id: 'Zone C', name: 'Back Left', students_count: 0, teacher_present: false, fans: [5, 6], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone D': { zone_id: 'Zone D', name: 'Back Right', students_count: 0, teacher_present: false, fans: [7, 8], student_preference: 'no_preference', teacher_preference: 'no_preference' },
        },
        teacher_zone: 'None',
        teacher_preference: 'no_preference',
      };
    } else if (scenario === 'vacant') {
      p = {
        ...p,
        students_count: 0,
        temperature: 24.0,
        light_intensity: 200.0,
        activity: 'No class',
        zones: {
          'Zone A': { zone_id: 'Zone A', name: 'Front Left', students_count: 0, teacher_present: false, fans: [1, 2], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone B': { zone_id: 'Zone B', name: 'Front Right', students_count: 0, teacher_present: false, fans: [3, 4], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone C': { zone_id: 'Zone C', name: 'Back Left', students_count: 0, teacher_present: false, fans: [5, 6], student_preference: 'no_preference', teacher_preference: 'no_preference' },
          'Zone D': { zone_id: 'Zone D', name: 'Back Right', students_count: 0, teacher_present: false, fans: [7, 8], student_preference: 'no_preference', teacher_preference: 'no_preference' },
        },
        teacher_zone: 'None',
        teacher_preference: 'no_preference',
      };
    }

    setTestPercepts(p);
    runComparison(p);
  };

  return (
    <div className="page-body">
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
          Multi-Agent Architecture Benchmark
        </h1>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
          Run all four independent rational agent implementations against the exact same classroom inputs to observe their dynamic zone fan decisions, power consumption, and comfort tradeoffs.
        </p>
      </div>

      {/* Scenario Filter Tabs */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Select Evaluation Conditions:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTabScenario === 'current' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('current')}
              >
                🔴 Live Classroom State
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTabScenario === 'hot_two_zones' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('hot_two_zones')}
              >
                🔥 Hot (32°C) - Zones A & B Only
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTabScenario === 'hot_all_zones' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('hot_all_zones')}
              >
                🌡️ Hot (32°C) - All 4 Zones
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTabScenario === 'cold_student_req' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('cold_student_req')}
              >
                ❄️ Cold (20°C) + Zone A Student Request
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTabScenario === 'vacant' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('vacant')}
              >
                🚪 Vacant Classroom (0 Students)
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => runComparison(testPercepts)}
            disabled={isLoading}
          >
            <RotateCw size={14} className={isLoading ? 'fan-spinning' : ''} />
            <span>Re-evaluate</span>
          </button>
        </div>

        {/* Input Parameters Summary Bar */}
        <div style={{
          marginTop: '1rem',
          padding: '0.65rem 1rem',
          backgroundColor: 'var(--bg-subtle)',
          borderRadius: '8px',
          display: 'flex',
          gap: '1.25rem',
          flexWrap: 'wrap',
          fontSize: '0.8rem',
          color: 'var(--text-main)'
        }}>
          <span>Students: <strong>{testPercepts.students_count}</strong></span>
          <span>Temperature: <strong>{testPercepts.temperature}°C</strong></span>
          <span>Light Intensity: <strong>{testPercepts.light_intensity} lux</strong></span>
          <span>Activity: <strong>{testPercepts.activity}</strong></span>
          <span>Zone A: <strong>{testPercepts.zones?.['Zone A']?.students_count ?? 0} st</strong></span>
          <span>Zone B: <strong>{testPercepts.zones?.['Zone B']?.students_count ?? 0} st</strong></span>
          <span>Zone C: <strong>{testPercepts.zones?.['Zone C']?.students_count ?? 0} st</strong></span>
          <span>Zone D: <strong>{testPercepts.zones?.['Zone D']?.students_count ?? 0} st</strong></span>
        </div>
      </div>

      {/* TABLE 1: DYNAMIC ZONE-BASED FAN CONTROL MATRIX (Prompt Section 9) */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wind size={20} color="var(--primary-blue)" />
            <span>Dynamic Zone-Based Fan Comparison Matrix (8 Fans / 4 Zones)</span>
          </div>
          <span className="badge badge-blue">Section 9 Spec</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ minWidth: '150px' }}>Agent Name</th>
                <th style={{ minWidth: '180px' }}>Fan 1 to Fan 8 States</th>
                <th>Active Fans</th>
                <th>Fan Power</th>
                <th style={{ minWidth: '180px' }}>Zone Coverage</th>
                <th>Architecture Details</th>
                <th style={{ minWidth: '220px' }}>Decision Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => {
                const isActive = activeAgent === c.agent_type;
                const fanStates = c.fan_states || {};

                return (
                  <tr key={c.agent_type} style={{ backgroundColor: isActive ? '#f0fdf4' : 'transparent' }}>
                    {/* Agent Name */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                        {c.agent_name}
                      </div>
                      <span className="badge badge-gray" style={{ fontSize: '0.68rem', marginTop: '0.2rem' }}>
                        {c.agent_type}
                      </span>
                    </td>

                    {/* Fan 1 to Fan 8 States */}
                    <td>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', maxWidth: '170px' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((fId) => {
                          const isOn = !!fanStates[fId];
                          return (
                            <span
                              key={fId}
                              className={`badge ${isOn ? 'badge-green' : 'badge-gray'}`}
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.15rem 0.25rem',
                                textAlign: 'center',
                                fontWeight: 700
                              }}
                              title={`Fan ${fId}: ${isOn ? 'ON (60W)' : 'OFF'}`}
                            >
                              F{fId}:{isOn ? 'ON' : 'OFF'}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Total Active Fans */}
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: c.active_fan_count > 0 ? '#0284c7' : 'var(--text-muted)' }}>
                        {c.active_fan_count} / 8
                      </div>
                    </td>

                    {/* Total Fan Power */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Zap size={13} color="#10b981" />
                        <strong>{c.fan_power_w.toFixed(0)} W</strong>
                      </div>
                    </td>

                    {/* Zone Coverage */}
                    <td>
                      <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {Object.entries(c.zone_coverage || {}).map(([zId, status]) => (
                          <div key={zId} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 600 }}>{zId}:</span>
                            <span style={{ color: status.includes('ON') ? '#059669' : 'var(--text-muted)' }}>
                              {status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Architecture Specific Detail */}
                    <td>
                      {c.agent_type === 'simple_reflex' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Rules: {c.matched_detail ? c.matched_detail.slice(0, 70) + '...' : 'Condition-Action evaluated'}
                        </div>
                      )}
                      {c.agent_type === 'model_based' && (
                        <div style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>
                          Belief: <strong>{c.memory_info?.internal_occupancy_belief || 'Active'}</strong><br />
                          Streak zeros: {c.memory_info?.occupancy_streak_zeros ?? 0}
                        </div>
                      )}
                      {c.agent_type === 'goal_based' && (
                        <div style={{ fontSize: '0.7rem', color: '#166534' }}>
                          {c.goal_status_list ? c.goal_status_list.slice(0, 2).map((g, i) => (
                            <div key={i}>✓ {g}</div>
                          )) : 'Goals evaluated'}
                        </div>
                      )}
                      {c.agent_type === 'utility_based' && (
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed' }}>
                          U = {c.utility_score.toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Decision Reason */}
                    <td>
                      <div style={{ fontSize: '0.76rem', color: 'var(--primary-navy)', lineHeight: 1.35 }}>
                        {c.reason}
                      </div>
                    </td>

                    {/* Controller Switcher */}
                    <td>
                      {isActive ? (
                        <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                          <CheckCircle2 size={13} style={{ marginRight: '0.25rem' }} />
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectAgent(c.agent_type)}
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: OVERALL ELECTRICAL & COMFORT SUMMARY */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitCompare size={20} color="var(--primary-blue)" />
            <span>Overall Device State & Energy Benchmark</span>
          </div>
          <span className="badge badge-green">Side-by-Side</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Agent Architecture</th>
                <th>Lights (400W)</th>
                <th>Ventilation Fans</th>
                <th>Projector (250W)</th>
                <th>Comfort Score</th>
                <th>Total Power</th>
                <th>Rational Utility</th>
                <th>Controller Action</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => {
                const isActive = activeAgent === c.agent_type;
                return (
                  <tr key={c.agent_type} style={{ backgroundColor: isActive ? '#f0fdf4' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                        {c.agent_name}
                      </div>
                    </td>

                    {/* Lights */}
                    <td>
                      <span className={`badge ${c.lights ? 'badge-green' : 'badge-gray'}`}>
                        {c.lights ? 'ON (400W)' : 'OFF'}
                      </span>
                    </td>

                    {/* Fans */}
                    <td>
                      <span className={`badge ${c.fans ? 'badge-green' : 'badge-gray'}`}>
                        {c.active_fan_count > 0 ? `${c.active_fan_count} Active (${c.fan_power_w}W)` : 'OFF (0W)'}
                      </span>
                    </td>

                    {/* Projector */}
                    <td>
                      <span className={`badge ${c.projector ? 'badge-green' : 'badge-gray'}`}>
                        {c.projector ? 'ON (250W)' : 'OFF'}
                      </span>
                    </td>

                    {/* Comfort */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Heart size={14} color="#ef4444" />
                        <strong style={{ color: c.comfort_score >= 80 ? '#059669' : '#d97706' }}>
                          {c.comfort_score.toFixed(1)}
                        </strong>
                      </div>
                    </td>

                    {/* Power Draw */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Zap size={14} color="#10b981" />
                        <strong>{c.power_w.toFixed(0)} W</strong>
                      </div>
                    </td>

                    {/* Utility */}
                    <td>
                      <span className="badge badge-blue">
                        U = {c.utility_score.toFixed(2)}
                      </span>
                    </td>

                    {/* Action */}
                    <td>
                      {isActive ? (
                        <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Active</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectAgent(c.agent_type)}
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep-Dive Explanations for Each Agent */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {comparisons.map((c) => (
          <div key={c.agent_type} className="card">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.5rem'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                {c.agent_name}
              </h3>
              <span className="badge badge-gray">{c.agent_type}</span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--primary-navy)', lineHeight: 1.45, marginBottom: '0.75rem' }}>
              <strong>Decision Logic:</strong> {c.reason}
            </p>

            {c.matched_detail && (
              <div style={{
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: '6px',
                fontSize: '0.73rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap'
              }}>
                {c.matched_detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
