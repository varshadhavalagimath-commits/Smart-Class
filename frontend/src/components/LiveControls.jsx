import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Clock, 
  SlidersHorizontal,
  Activity,
  Layers,
  Radio
} from 'lucide-react';

export default function LiveControls({
  isRunning,
  stepCount,
  simulatedTime,
  schedulePhase,
  config,
  onStart,
  onPause,
  onReset,
  onStep,
  onUpdateConfig,
  onSelectAgent,
  isLoading
}) {
  const currentInterval = config?.update_interval_sec ?? 2.0;
  const currentAgent = config?.active_agent ?? 'utility_based';
  const noiseEnabled = config?.noise_enabled ?? false;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Left: Status and Simulation Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`live-indicator-dot ${isRunning ? 'dot-green' : 'dot-orange'}`} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-navy)' }}>
              {isRunning ? 'Simulation Running' : 'Simulation Paused'}
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'var(--bg-subtle)',
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--primary-navy)'
          }}>
            <Clock size={15} color="var(--primary-blue)" />
            <span>Time: {simulatedTime}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: config?.mode === 'manual' ? '#fffbeb' : '#eff6ff',
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            border: config?.mode === 'manual' ? '1px solid #fde68a' : '1px solid #bfdbfe',
            fontSize: '0.8rem',
            color: config?.mode === 'manual' ? '#b45309' : '#1d4ed8',
            fontWeight: 600
          }}>
            <Activity size={14} />
            <span>{config?.mode === 'manual' ? 'Mode B: Manual Control' : `Mode A: ${schedulePhase}`} (Step {stepCount})</span>
          </div>
        </div>

        {/* Center/Right: Simulation Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isRunning ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={onPause}
              disabled={isLoading}
              title="Pause automatic continuous simulation"
            >
              <Pause size={15} />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onStart}
              disabled={isLoading}
              title="Start continuous automatic simulation"
            >
              <Play size={15} />
              <span>Start Live Simulation</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline"
            onClick={onStep}
            disabled={isLoading || isRunning}
            title="Advance one step in time"
          >
            <SkipForward size={15} />
            <span>Step Tick</span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onReset}
            disabled={isLoading}
            title="Reset simulation to 08:00 AM initial state"
          >
            <RotateCcw size={15} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Secondary Bar: Active Agent Selector & Interval & Noise Toggle */}
      <div style={{
        marginTop: '1.25rem',
        paddingTop: '1rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Active Agent Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-navy)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Layers size={15} color="var(--primary-blue)" />
            <span>Active Agent:</span>
          </label>
          <select
            className="form-select"
            style={{ width: '220px', padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
            value={currentAgent}
            onChange={(e) => onSelectAgent(e.target.value)}
          >
            <option value="utility_based">Utility-Based Rational Agent (Primary)</option>
            <option value="simple_reflex">Simple Reflex Agent</option>
            <option value="model_based">Model-Based Agent</option>
            <option value="goal_based">Goal-Based Agent</option>
          </select>
        </div>

        {/* Update Interval Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Update Interval: <strong>{currentInterval}s</strong>
          </span>
          <input
            type="range"
            min="1.0"
            max="5.0"
            step="0.5"
            value={currentInterval}
            onChange={(e) => onUpdateConfig({ update_interval_sec: parseFloat(e.target.value) })}
            style={{ cursor: 'pointer', width: '100px' }}
          />
        </div>

        {/* Sensor Noise Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
            userSelect: 'none',
            color: noiseEnabled ? '#b45309' : 'var(--text-muted)',
            fontWeight: 600
          }}>
            <Radio size={14} color={noiseEnabled ? '#f59e0b' : '#94a3b8'} />
            <span>Sensor Noise:</span>
            <input
              type="checkbox"
              checked={noiseEnabled}
              onChange={(e) => onUpdateConfig({ noise_enabled: e.target.checked })}
              style={{ cursor: 'pointer', marginLeft: '2px' }}
            />
            <span className={`badge ${noiseEnabled ? 'badge-orange' : 'badge-gray'}`}>
              {noiseEnabled ? 'Active (Stochastic)' : 'OFF (Raw)'}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
