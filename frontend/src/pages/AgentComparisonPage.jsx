import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  CheckCircle2, 
  Lightbulb, 
  Wind, 
  Video, 
  Zap, 
  Heart, 
  Check, 
  RotateCw,
  Sparkles,
  Sliders
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
    simulated_time: '10:00 AM'
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
    } else if (scenario === 'hot') {
      p = {
        ...p,
        students_count: 40,
        temperature: 34.0,
        light_intensity: 550.0,
        activity: 'Lecture',
      };
    } else if (scenario === 'vacant') {
      p = {
        ...p,
        students_count: 0,
        temperature: 24.0,
        light_intensity: 200.0,
        activity: 'No class',
      };
    } else if (scenario === 'dark') {
      p = {
        ...p,
        students_count: 35,
        temperature: 23.5,
        light_intensity: 85.0,
        activity: 'Lecture',
      };
    } else if (scenario === 'lab') {
      p = {
        ...p,
        students_count: 28,
        temperature: 25.0,
        light_intensity: 450.0,
        activity: 'Lab',
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
          Run all four independent rational agent implementations against the exact same classroom inputs to observe their decision policies and energy tradeoffs.
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
                className={`btn btn-sm ${activeTabScenario === 'hot' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('hot')}
              >
                🔥 High Temperature (34°C)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTabScenario === 'vacant' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('vacant')}
              >
                🚪 Vacant Classroom (0 Students)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTabScenario === 'dark' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('dark')}
              >
                🌙 Dim Light (85 lux)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTabScenario === 'lab' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleScenarioChange('lab')}
              >
                💻 Lab Practical Session
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
          gap: '1.5rem',
          flexWrap: 'wrap',
          fontSize: '0.8rem',
          color: 'var(--text-main)'
        }}>
          <span>Students: <strong>{testPercepts.students_count}</strong></span>
          <span>Temperature: <strong>{testPercepts.temperature}°C</strong></span>
          <span>Light Intensity: <strong>{testPercepts.light_intensity} lux</strong></span>
          <span>Activity: <strong>{testPercepts.activity}</strong></span>
          <span>Door: <strong>{testPercepts.door_status}</strong></span>
          <span>Window: <strong>{testPercepts.window_status}</strong></span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitCompare size={20} color="var(--primary-blue)" />
            <span>Side-by-Side Agent Decision Matrix</span>
          </div>
          <span className="badge badge-green">4 Real Python Implementations</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Agent Architecture</th>
                <th>Lights (400W)</th>
                <th>Fans (300W)</th>
                <th>Projector (250W)</th>
                <th>Comfort Score</th>
                <th>Power Draw</th>
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
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {c.agent_type === 'utility_based' && 'Multi-Objective Utility Optimizer'}
                        {c.agent_type === 'simple_reflex' && 'Condition-Action Rule Table'}
                        {c.agent_type === 'model_based' && 'Internal State & Trend Model'}
                        {c.agent_type === 'goal_based' && 'Goal Formulation & Satisfaction'}
                      </div>
                    </td>

                    {/* Lights */}
                    <td>
                      <span className={`badge ${c.lights ? 'badge-green' : 'badge-gray'}`}>
                        {c.lights ? 'ON' : 'OFF'}
                      </span>
                    </td>

                    {/* Fans */}
                    <td>
                      <span className={`badge ${c.fans ? 'badge-green' : 'badge-gray'}`}>
                        {c.fans ? 'ON' : 'OFF'}
                      </span>
                    </td>

                    {/* Projector */}
                    <td>
                      <span className={`badge ${c.projector ? 'badge-green' : 'badge-gray'}`}>
                        {c.projector ? 'ON' : 'OFF'}
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

                    {/* Controller Switcher */}
                    <td>
                      {isActive ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}>
                          <CheckCircle2 size={16} />
                          <span>Active</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => onSelectAgent(c.agent_type)}
                        >
                          <span>Set as Active</span>
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
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)'
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
