import React, { useState, useEffect } from 'react';
import { 
  History, 
  Trash2, 
  RotateCw, 
  Search, 
  Filter, 
  CheckCircle2, 
  Lightbulb, 
  Wind, 
  Video,
  Download
} from 'lucide-react';
import { api } from '../services/api';

export default function DecisionHistoryPage() {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterAgent, setFilterAgent] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getHistory(200);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear the entire simulation decision history?')) {
      try {
        await api.clearHistory();
        setHistory([]);
        setActionMessage('Decision history cleared from SQLite database.');
        setTimeout(() => setActionMessage(''), 3000);
      } catch (err) {
        alert('Failed to clear history: ' + err.message);
      }
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const headers = [
      'ID', 'Timestamp', 'Simulated Time', 'Mode', 'Students', 'Zone Occupancy',
      'Temp (°C)', 'Light (lux)', 'Activity', 'Agent', 'Lights', 'Active Fans', 
      'Fan Power (W)', 'Fan States', 'Projector', 'Total Power (W)', 'Comfort', 'Reason'
    ];
    const rows = history.map(item => [
      item.id,
      `"${item.timestamp}"`,
      `"${item.simulated_time}"`,
      `"${item.mode || 'automatic'}"`,
      item.students_count,
      item.zone_occupancy ? `"${JSON.stringify(item.zone_occupancy).replace(/"/g, '""')}"` : '""',
      item.temperature,
      item.light_intensity,
      `"${item.activity}"`,
      `"${item.agent_type}"`,
      item.lights ? 'ON' : 'OFF',
      item.active_fan_count || (item.fans ? 1 : 0),
      item.fan_power_w || (item.fans ? 60 : 0),
      item.fan_states ? `"${JSON.stringify(item.fan_states).replace(/"/g, '""')}"` : '""',
      item.projector ? 'ON' : 'OFF',
      item.power_w,
      item.comfort_score,
      `"${(item.reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `classroom_zone_decisions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered history list
  const filteredHistory = history.filter(item => {
    if (filterAgent !== 'all' && item.agent_type !== filterAgent) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchReason = (item.reason || '').toLowerCase().includes(term);
      const matchTime = (item.simulated_time || '').toLowerCase().includes(term);
      const matchActivity = (item.activity || '').toLowerCase().includes(term);
      if (!matchReason && !matchTime && !matchActivity) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="page-body">
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
            Autonomous Decision History Audit Log
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Chronological audit log of every percept evaluated, 8-fan zone state actuated, and rational justification stored in SQLite.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportCSV}
            disabled={history.length === 0}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadHistory}
            disabled={isLoading}
          >
            <RotateCw size={14} className={isLoading ? 'fan-spinning' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={handleClearHistory}
            disabled={history.length === 0}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div style={{
          padding: '0.65rem 0.85rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          color: '#059669',
          fontSize: '0.82rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="form-input"
              placeholder="Search explanations, time, activity, zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.84rem' }}
            />
          </div>

          {/* Filter by Agent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Agent:</span>
            <select
              className="form-select"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              style={{ width: '180px', padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
            >
              <option value="all">All Agents ({history.length})</option>
              <option value="utility_based">Utility-Based</option>
              <option value="simple_reflex">Simple Reflex</option>
              <option value="model_based">Model-Based</option>
              <option value="goal_based">Goal-Based</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        <div className="card-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} color="var(--primary-blue)" />
            <span>Decisions Log ({filteredHistory.length} Records)</span>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No decisions matching current criteria. Start the simulation or apply manual inputs to record decisions.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Time / Mode</th>
                  <th>Occupancy</th>
                  <th>Climate</th>
                  <th>Agent</th>
                  <th>Lights & Projector</th>
                  <th>Zone Fans (8 Units)</th>
                  <th>Total Power</th>
                  <th>Comfort</th>
                  <th style={{ minWidth: '220px' }}>Decision Justification</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => {
                  const fanCount = item.active_fan_count || (item.fans ? 1 : 0);
                  const fanPower = item.fan_power_w || (item.fans ? 60 : 0);
                  const fanStates = item.fan_states || {};
                  const activeFanIds = Object.entries(fanStates).filter(([_, state]) => state).map(([id]) => `F${id}`);

                  return (
                    <tr key={item.id}>
                      {/* Time / Mode */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                          {item.simulated_time}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {item.timestamp.slice(11)}
                        </div>
                        <span className={`badge ${item.mode === 'manual' ? 'badge-orange' : 'badge-blue'}`} style={{ fontSize: '0.62rem', marginTop: '0.2rem' }}>
                          {item.mode === 'manual' ? 'MANUAL' : 'AUTO'}
                        </span>
                      </td>

                      {/* Occupancy & Zones */}
                      <td>
                        <span className={`badge ${item.students_count > 0 ? 'badge-blue' : 'badge-gray'}`}>
                          {item.students_count} st.
                        </span>
                        {item.zone_occupancy && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            A:{item.zone_occupancy['Zone A'] ?? 0} B:{item.zone_occupancy['Zone B'] ?? 0}<br />
                            C:{item.zone_occupancy['Zone C'] ?? 0} D:{item.zone_occupancy['Zone D'] ?? 0}
                          </div>
                        )}
                      </td>

                      {/* Climate */}
                      <td>
                        <strong style={{ color: item.temperature > 26 ? '#ef4444' : item.temperature < 22 ? '#3b82f6' : '#10b981' }}>
                          {item.temperature}°C
                        </strong>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {item.light_intensity} lux
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {item.activity}
                        </div>
                      </td>

                      {/* Agent */}
                      <td>
                        <span className="badge badge-blue">
                          {item.agent_type === 'utility_based' ? 'Utility' : 
                           item.agent_type === 'simple_reflex' ? 'Reflex' : 
                           item.agent_type === 'model_based' ? 'Model' : 'Goal'}
                        </span>
                      </td>

                      {/* Lights & Projector */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span className={`badge ${item.lights ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.68rem' }}>
                            Lights: {item.lights ? 'ON (400W)' : 'OFF'}
                          </span>
                          <span className={`badge ${item.projector ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.68rem' }}>
                            Proj: {item.projector ? 'ON (250W)' : 'OFF'}
                          </span>
                        </div>
                      </td>

                      {/* Zone Fans (8 Units) */}
                      <td>
                        <div>
                          <span className={`badge ${fanCount > 0 ? 'badge-green' : 'badge-gray'}`}>
                            {fanCount > 0 ? `${fanCount}/8 Fans ON (${fanPower}W)` : 'All Fans OFF (0W)'}
                          </span>
                          {activeFanIds.length > 0 && (
                            <div style={{ fontSize: '0.68rem', color: '#0369a1', marginTop: '0.2rem', fontWeight: 600 }}>
                              Active: {activeFanIds.join(', ')}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Total Power */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                            {item.power_w.toFixed(0)} W
                          </span>
                        </div>
                      </td>

                      {/* Comfort */}
                      <td>
                        <strong style={{ color: item.comfort_score >= 80 ? '#059669' : '#d97706' }}>
                          {item.comfort_score.toFixed(0)}
                        </strong>
                      </td>

                      {/* Decision Justification */}
                      <td>
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-navy)', lineHeight: 1.35 }}>
                          {item.reason}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
