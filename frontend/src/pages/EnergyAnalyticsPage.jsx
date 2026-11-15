import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Zap, 
  TrendingDown, 
  Heart, 
  Clock, 
  Activity, 
  ShieldCheck,
  RotateCw,
  Lightbulb,
  Wind,
  Video
} from 'lucide-react';
import { api } from '../services/api';

export default function EnergyAnalyticsPage({ state }) {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 4000);
    return () => clearInterval(interval);
  }, []);

  const totalKwh = analytics?.total_energy_kwh ?? state?.metrics?.total_energy_kwh ?? 0;
  const baselineKwh = analytics?.baseline_energy_kwh ?? state?.metrics?.baseline_energy_kwh ?? 0;
  const savedKwh = analytics?.energy_saved_kwh ?? state?.metrics?.energy_saved_kwh ?? 0;
  const savingsPct = analytics?.savings_percentage ?? state?.metrics?.savings_percentage ?? 0;
  const avgComfort = analytics?.average_comfort ?? state?.metrics?.average_comfort ?? 100;
  const runtime = analytics?.device_runtime_minutes ?? state?.metrics?.device_runtime_minutes ?? { lights: 0, fans: 0, projector: 0 };
  const historyPoints = analytics?.history_points || [];

  // Device runtime data for chart
  const runtimeData = [
    { name: 'Lights (400W)', minutes: runtime.lights || 0, fill: '#facc15' },
    { name: 'Fans (300W)', minutes: runtime.fans || 0, fill: '#38bdf8' },
    { name: 'Projector (250W)', minutes: runtime.projector || 0, fill: '#3b82f6' },
  ];

  return (
    <div className="page-body">
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
            Energy Analytics & Efficiency Reports
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Empirical measurements of classroom electrical energy demand, baseline comparison, and comfort indices.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={fetchAnalyticsData}
          disabled={isLoading}
        >
          <RotateCw size={14} className={isLoading ? 'fan-spinning' : ''} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        {/* Total Consumed */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Agent Energy Consumed</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#eff6ff' }}>
              <Zap size={18} color="#2563eb" />
            </div>
          </div>
          <div>
            <div className="metric-value">{totalKwh.toFixed(3)} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>kWh</span></div>
            <div className="metric-sub">
              <span>Actual load from active devices</span>
            </div>
          </div>
        </div>

        {/* Baseline Energy */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Unmanaged Baseline</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#fee2e2' }}>
              <Activity size={18} color="#ef4444" />
            </div>
          </div>
          <div>
            <div className="metric-value">{baselineKwh.toFixed(3)} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>kWh</span></div>
            <div className="metric-sub">
              <span>Conventional static classroom</span>
            </div>
          </div>
        </div>

        {/* Energy Saved */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Total Energy Saved</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#ecfdf5' }}>
              <TrendingDown size={18} color="#059669" />
            </div>
          </div>
          <div>
            <div className="metric-value" style={{ color: '#059669' }}>
              {savedKwh.toFixed(3)} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>kWh</span>
            </div>
            <div className="metric-sub">
              <span className="badge badge-green">
                {savingsPct.toFixed(1)}% Reduction
              </span>
            </div>
          </div>
        </div>

        {/* Average Comfort */}
        <div className="metric-card">
          <div className="metric-card-top">
            <span className="metric-label">Average Comfort Score</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#f0fdf4' }}>
              <Heart size={18} color="#16a34a" />
            </div>
          </div>
          <div>
            <div className="metric-value">{avgComfort.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>/ 100</span></div>
            <div className="metric-sub">
              <span className="badge badge-blue">
                Optimal Visual & Thermal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart 1: Real-Time Power Demand vs Baseline (Watts) */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-title">
          <span>Real-Time Power Demand vs Unmanaged Baseline (Watts)</span>
          <span className="badge badge-blue">Time Series</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Demonstrates power reduction when intelligent agent switches off unnecessary lights, fans, and projector during breaks or adequate natural light.
        </p>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorAgent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="simulated_time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} label={{ value: 'Watts (W)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#64748b' } }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="baseline_power_w" name="Baseline Power (W)" stroke="#ef4444" fillOpacity={1} fill="url(#colorBaseline)" />
              <Area type="monotone" dataKey="agent_power_w" name="Agent Managed Power (W)" stroke="#10b981" fillOpacity={1} fill="url(#colorAgent)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: 2 Charts Side by Side (Cumulative Energy kWh & Comfort Index) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Cumulative Energy Consumed vs Saved */}
        <div className="card">
          <div className="card-title">
            <span>Cumulative Energy Savings (kWh)</span>
            <span className="badge badge-green">Accumulated</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="simulated_time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="cumulative_savings_kwh" name="Energy Saved (kWh)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="cumulative_energy_kwh" name="Energy Consumed (kWh)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comfort Score Stability */}
        <div className="card">
          <div className="card-title">
            <span>Classroom Comfort Index Over Time</span>
            <span className="badge badge-blue">Target: &gt;80</span>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyPoints} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="simulated_time" stroke="#64748b" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="comfort_score" name="Comfort Score (0–100)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Device Runtime Breakdown */}
      <div className="card">
        <div className="card-title">
          <span>Device Operating Duration Breakdown</span>
          <span className="badge badge-gray">Simulated Minutes</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={runtimeData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={11} unit=" min" />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="minutes" name="Operating Minutes" radius={[0, 6, 6, 0]}>
                  {runtimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lightbulb size={16} color="#ca8a04" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Classroom Lights (400W)</span>
              </div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--primary-navy)' }}>{runtime.lights || 0} min</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wind size={16} color="#0284c7" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ceiling Fans (300W)</span>
              </div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--primary-navy)' }}>{runtime.fans || 0} min</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Video size={16} color="#2563eb" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Instructional Projector (250W)</span>
              </div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--primary-navy)' }}>{runtime.projector || 0} min</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
