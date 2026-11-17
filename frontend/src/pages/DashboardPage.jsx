import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Users, 
  Thermometer, 
  Sun, 
  Zap, 
  Heart, 
  Lightbulb, 
  Wind, 
  Video, 
  Clock, 
  Activity,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Award
} from 'lucide-react';
import ClassroomVisualizer from '../components/ClassroomVisualizer';

export default function DashboardPage({ state, onSelectAgent }) {
  const percepts = state?.current_percepts;
  const devices = state?.current_devices;
  const metrics = state?.metrics;
  const decision = state?.last_decision;
  const isRunning = state?.is_running;

  const students = percepts?.students_count ?? 0;
  const isOccupied = students > 0;
  const temp = percepts?.temperature ?? 24.0;
  const lux = percepts?.light_intensity ?? 400.0;
  const activity = percepts?.activity ?? 'Lecture';
  const simulatedTime = state?.simulated_time ?? '08:00 AM';

  const lightsOn = devices?.lights ?? false;
  const fansOn = devices?.fans ?? false;
  const projectorOn = devices?.projector ?? false;
  const activeFanCount = devices?.active_fan_count ?? (fansOn ? 1 : 0);
  const fanPowerW = devices?.fan_power_w ?? (fansOn ? 60 : 0);

  return (
    <div className="page-body">
      {/* Welcome Banner */}
      <div style={{
        padding: '1.5rem 1.75rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
        borderRadius: '16px',
        color: '#ffffff',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span className={`live-indicator-dot ${isRunning ? 'dot-green' : 'dot-orange'}`} />
            <span style={{ fontSize: '0.8rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              {isRunning ? 'Autonomous Live Simulation Active' : 'Simulation Engine Standby'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            Smart Classroom Energy Management Agent
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginTop: '0.35rem', maxWidth: '750px' }}>
            Rational intelligent agents continuously optimize classroom lighting, HVAC ventilation, and audiovisual systems to minimize unneeded electrical load while ensuring student comfort.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <NavLink to="/simulator" className="btn btn-primary" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
            <span>Open Simulator</span>
            <ArrowRight size={16} />
          </NavLink>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="metrics-grid">
        {/* Occupancy & Students */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Classroom Occupancy</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#eff6ff' }}>
              <Users size={18} color="#2563eb" />
            </div>
          </div>
          <div>
            <div className="metric-value">{students}</div>
            <div className="metric-sub">
              <span className={`badge ${isOccupied ? 'badge-green' : 'badge-gray'}`}>
                {isOccupied ? 'Occupied' : 'Vacant'}
              </span>
              <span>Activity: <strong>{activity}</strong></span>
            </div>
          </div>
        </div>

        {/* Temperature */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Indoor Temperature</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#fee2e2' }}>
              <Thermometer size={18} color="#ef4444" />
            </div>
          </div>
          <div>
            <div className="metric-value">{temp.toFixed(1)}°C</div>
            <div className="metric-sub">
              <span className={`badge ${temp > 26 ? 'badge-red' : temp < 22 ? 'badge-blue' : 'badge-green'}`}>
                {temp > 26 ? 'Warm (>26°)' : temp < 22 ? 'Cool (<22°)' : 'Optimal (22–26°)'}
              </span>
              <span>Target: 22–26°C</span>
            </div>
          </div>
        </div>

        {/* Ambient Light */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Ambient Light</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#fef9c3' }}>
              <Sun size={18} color="#ca8a04" />
            </div>
          </div>
          <div>
            <div className="metric-value">{lux.toFixed(0)} <span style={{ fontSize: '1rem', fontWeight: 600 }}>lux</span></div>
            <div className="metric-sub">
              <span className={`badge ${lux >= 300 ? 'badge-green' : 'badge-orange'}`}>
                {lux >= 300 ? 'Daylight Sufficient' : 'Dim (<300 lux)'}
              </span>
              <span>Threshold: 300 lux</span>
            </div>
          </div>
        </div>

        {/* Current Power Draw */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Active Power Draw</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#ecfdf5' }}>
              <Zap size={18} color="#059669" />
            </div>
          </div>
          <div>
            <div className="metric-value">{metrics?.current_power_w ?? 0} <span style={{ fontSize: '1rem', fontWeight: 600 }}>W</span></div>
            <div className="metric-sub">
              <span className="badge badge-green">
                Baseline: {metrics?.baseline_power_w ?? 950} W
              </span>
              <span>Saved: {Math.max(0, (metrics?.baseline_power_w ?? 950) - (metrics?.current_power_w ?? 0))} W</span>
            </div>
          </div>
        </div>

        {/* Cumulative Energy Saved */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Cumulative Savings</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#f0fdf4' }}>
              <TrendingDown size={18} color="#16a34a" />
            </div>
          </div>
          <div>
            <div className="metric-value">{metrics?.energy_saved_kwh ?? 0} <span style={{ fontSize: '1rem', fontWeight: 600 }}>kWh</span></div>
            <div className="metric-sub">
              <span className="badge badge-green">
                {metrics?.savings_percentage ?? 0}% Reduced
              </span>
              <span>Total Consumed: {metrics?.total_energy_kwh ?? 0} kWh</span>
            </div>
          </div>
        </div>

        {/* Classroom Comfort Score */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Comfort Index</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#eff6ff' }}>
              <Heart size={18} color="#2563eb" />
            </div>
          </div>
          <div>
            <div className="metric-value">{decision?.comfort_score?.toFixed(1) ?? '100.0'}</div>
            <div className="metric-sub">
              <span className="badge badge-blue">
                Avg: {metrics?.average_comfort ?? 100}%
              </span>
              <span>Multi-Factor Comfort</span>
            </div>
          </div>
        </div>
      </div>

      {/* Classroom Visualizer and Live Devices Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(320px, 1fr)', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Left: Classroom Visualizer */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
              Live Classroom Environment
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Simulated Clock: <strong>{simulatedTime}</strong>
            </span>
          </div>
          <ClassroomVisualizer
            percepts={percepts}
            devices={devices}
            activeAgent={state?.active_agent}
            lastDecision={decision}
          />
        </div>

        {/* Right: Device Status & Agent Rational Reason */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Device Indicators Card */}
          <div className="card">
            <div className="card-title">
              <span>Managed Devices</span>
              <span className="badge badge-blue">Rated Capacity</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Lights */}
              <div className={`device-status-item ${lightsOn ? 'active' : ''}`}>
                <div className="device-info">
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: lightsOn ? '#fef08a' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Lightbulb size={20} color={lightsOn ? '#ca8a04' : '#64748b'} />
                  </div>
                  <div>
                    <div className="device-name">Classroom Lights</div>
                    <div className="device-power">400 W (320 Lux Boost)</div>
                  </div>
                </div>
                <span className={`badge ${lightsOn ? 'badge-green' : 'badge-gray'}`}>
                  {lightsOn ? 'ACTIVE (400W)' : 'OFF (0W)'}
                </span>
              </div>

              {/* Fans */}
              <div className={`device-status-item ${fansOn ? 'active' : ''}`}>
                <div className="device-info">
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: fansOn ? '#e0f2fe' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Wind size={20} color={fansOn ? '#0284c7' : '#64748b'} className={fansOn ? 'fan-spinning' : ''} />
                  </div>
                  <div>
                    <div className="device-name">Dynamic Zone Ventilation Fans</div>
                    <div className="device-power">{activeFanCount}/8 Active ({fanPowerW}W • 60W/unit)</div>
                  </div>
                </div>
                <span className={`badge ${fansOn ? 'badge-green' : 'badge-gray'}`}>
                  {fansOn ? `${activeFanCount} ACTIVE (${fanPowerW}W)` : 'OFF (0W)'}
                </span>
              </div>

              {/* Projector */}
              <div className={`device-status-item ${projectorOn ? 'active' : ''}`}>
                <div className="device-info">
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: projectorOn ? '#eff6ff' : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Video size={20} color={projectorOn ? '#2563eb' : '#64748b'} />
                  </div>
                  <div>
                    <div className="device-name">Instructional Projector</div>
                    <div className="device-power">250 W (Lecture & Lab Media)</div>
                  </div>
                </div>
                <span className={`badge ${projectorOn ? 'badge-green' : 'badge-gray'}`}>
                  {projectorOn ? 'PROJECTING (250W)' : 'STANDBY (0W)'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Agent Reason Card */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-title">
              <span>Agent Decision Explanation</span>
              <span className="badge badge-green">
                U = {decision?.utility_score?.toFixed(1) ?? '100.0'}
              </span>
            </div>

            <div style={{
              padding: '0.85rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Controller: {decision?.agent_name || state?.active_agent}
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--primary-navy)', lineHeight: 1.45 }}>
                {decision?.reason || 'Agent is monitoring current classroom parameters.'}
              </p>
            </div>

            <NavLink to="/simulator" className="btn btn-outline" style={{ width: '100%' }}>
              <span>Open Simulator & Manual Controls</span>
              <ArrowRight size={14} />
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
