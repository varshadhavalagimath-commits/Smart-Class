import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Tv, 
  GitCompare, 
  BarChart3, 
  History, 
  Zap,
  Cpu
} from 'lucide-react';

export default function Sidebar({ isRunning, activeAgent }) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Classroom Simulator', path: '/simulator', icon: Tv },
    { name: 'Agent Comparison', path: '/compare', icon: GitCompare },
    { name: 'Energy Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Decision History', path: '/history', icon: History },
  ];

  const agentLabelMap = {
    utility_based: 'Utility-Based',
    simple_reflex: 'Simple Reflex',
    model_based: 'Model-Based',
    goal_based: 'Goal-Based'
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-brand">
          <div className="brand-icon">
            <Zap size={22} color="#ffffff" />
          </div>
          <div className="brand-text">
            <h1>SMART CLASSROOM</h1>
            <span>Energy Agent AI</span>
          </div>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="sidebar-footer">
        <div>
          <span className={`live-indicator-dot ${isRunning ? 'dot-green' : 'dot-orange'}`} />
          <span style={{ color: '#cbd5e1' }}>{isRunning ? 'Engine Online' : 'Engine Idle'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#94a3b8' }}>
          <Cpu size={12} />
          <span>{agentLabelMap[activeAgent] || 'Agent'}</span>
        </div>
      </div>
    </aside>
  );
}
