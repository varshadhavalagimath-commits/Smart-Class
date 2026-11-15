import React from 'react';
import { 
  Zap, 
  Users, 
  Thermometer, 
  Sun, 
  Layers,
  Sparkles
} from 'lucide-react';

export default function Navbar({ state }) {
  const percepts = state?.current_percepts;
  const metrics = state?.metrics;
  const activeAgent = state?.active_agent;

  const agentLabelMap = {
    utility_based: 'Utility Rational Agent',
    simple_reflex: 'Simple Reflex Agent',
    model_based: 'Model-Based Agent',
    goal_based: 'Goal-Based Agent'
  };

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
          Smart Classroom Energy Management System
        </h2>
        <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
          Autonomous Multi-Agent AI
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Real-time agent badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: 'var(--bg-subtle)',
          padding: '0.3rem 0.65rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>
          <Layers size={14} color="var(--primary-blue)" />
          <span style={{ color: 'var(--text-muted)' }}>Controller:</span>
          <span style={{ color: 'var(--primary-navy)' }}>{agentLabelMap[activeAgent] || activeAgent}</span>
        </div>

        {/* Current Power draw */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: '#ecfdf5',
          padding: '0.3rem 0.65rem',
          borderRadius: '8px',
          border: '1px solid #a7f3d0',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: '#059669'
        }}>
          <Zap size={14} color="#10b981" />
          <span>{metrics?.current_power_w ?? 0} W Draw</span>
        </div>

        {/* Energy Savings % */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: '#eff6ff',
          padding: '0.3rem 0.65rem',
          borderRadius: '8px',
          border: '1px solid #bfdbfe',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: '#1d4ed8'
        }}>
          <Sparkles size={14} color="#2563eb" />
          <span>{metrics?.savings_percentage ?? 0}% Saved</span>
        </div>
      </div>
    </header>
  );
}
