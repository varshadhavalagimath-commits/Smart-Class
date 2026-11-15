import React from 'react';
import LiveControls from '../components/LiveControls';
import ClassroomVisualizer from '../components/ClassroomVisualizer';
import ManualControlPanel from '../components/ManualControlPanel';
import AgentCard from '../components/AgentCard';

export default function SimulatorPage({
  state,
  onStart,
  onPause,
  onReset,
  onStep,
  onUpdateConfig,
  onSelectAgent,
  onApplyManual,
  onResetDefault,
  isLoading
}) {
  const percepts = state?.current_percepts;
  const rawPercepts = state?.raw_percepts;
  const devices = state?.current_devices;
  const decision = state?.last_decision;
  const config = state?.config;
  const isRunning = state?.is_running;
  const stepCount = state?.step_count;
  const simulatedTime = state?.simulated_time;
  const schedulePhase = state?.schedule_phase;

  return (
    <div className="page-body">
      {/* Page Title Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
          Classroom Simulation & Control Hub
        </h1>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
          Operate in Mode A (Live Automatic Detection along daily schedule) or Mode B (Manual Entry Override).
        </p>
      </div>

      {/* Mode A Controls Bar */}
      <LiveControls
        isRunning={isRunning}
        stepCount={stepCount}
        simulatedTime={simulatedTime}
        schedulePhase={schedulePhase}
        config={config}
        onStart={onStart}
        onPause={onPause}
        onReset={onReset}
        onStep={onStep}
        onUpdateConfig={onUpdateConfig}
        onSelectAgent={onSelectAgent}
        isLoading={isLoading}
      />

      {/* Main Grid: Visualizer on Left, Manual Controls & Agent on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Left Column: Visualizer & Agent Rational Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                Real-Time Classroom Visualization
              </h2>
              {config?.noise_enabled && (
                <span className="badge badge-orange" title="Sensor noise enabled: sensor readings differ slightly from ground truth">
                  Perceived Readings (Noise Active)
                </span>
              )}
            </div>
            <ClassroomVisualizer
              percepts={percepts}
              devices={devices}
              activeAgent={state?.active_agent}
              lastDecision={decision}
            />
          </div>

          {/* Decision Reason & Candidate Breakdown Card */}
          <AgentCard decision={decision} />
        </div>

        {/* Right Column: Mode B Manual Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ManualControlPanel
            currentPercepts={percepts}
            onApplyManual={onApplyManual}
            onResetDefault={onResetDefault}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
