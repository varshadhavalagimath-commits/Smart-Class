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
      'ID', 'Timestamp', 'Simulated Time', 'Students', 'Temp (°C)', 'Light (lux)', 
      'Activity', 'Agent', 'Lights', 'Fans', 'Projector', 'Power (W)', 'Comfort', 'Reason'
    ];
    const rows = history.map(item => [
      item.id,
      `"${item.timestamp}"`,
      `"${item.simulated_time}"`,
      item.students_count,
      item.temperature,
      item.light_intensity,
      `"${item.activity}"`,
      `"${item.agent_type}"`,
      item.lights ? 'ON' : 'OFF',
      item.fans ? 'ON' : 'OFF',
      item.projector ? 'ON' : 'OFF',
      item.power_w,
      item.comfort_score,
      `"${item.reason.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `classroom_decisions_${new Date().toISOString().slice(0, 10)}.csv`);
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
      const matchReason = item.reason.toLowerCase().includes(term);
      const matchTime = item.simulated_time.toLowerCase().includes(term);
      const matchActivity = item.activity.toLowerCase().includes(term);
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
            Chronological audit log of every percept evaluated, device actuated, and rational justification stored in SQLite.
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
              placeholder="Search explanations, time, activity..."
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
                  <th>Time</th>
                  <th>Students</th>
                  <th>Temp</th>
                  <th>Light</th>
                  <th>Activity</th>
                  <th>Agent</th>
                  <th>Device Actions</th>
                  <th>Power (W)</th>
                  <th>Comfort</th>
                  <th>Decision Justification</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>
                        {item.simulated_time}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {item.timestamp.slice(11)}
                      </div>
                    </td>

                    <td>
                      <span className={`badge ${item.students_count > 0 ? 'badge-blue' : 'badge-gray'}`}>
                        {item.students_count} st.
                      </span>
                    </td>

                    <td>
                      <strong style={{ color: item.temperature > 26 ? '#ef4444' : item.temperature < 22 ? '#3b82f6' : '#10b981' }}>
                        {item.temperature}°C
                      </strong>
                    </td>

                    <td>{item.light_intensity} lux</td>

                    <td>
                      <span className="badge badge-gray">{item.activity}</span>
                    </td>

                    <td>
                      <span className="badge badge-blue">
                        {item.agent_type === 'utility_based' ? 'Utility' : 
                         item.agent_type === 'simple_reflex' ? 'Reflex' : 
                         item.agent_type === 'model_based' ? 'Model' : 'Goal'}
                      </span>
                    </td>

                    {/* Devices */}
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <span className={`badge ${item.lights ? 'badge-green' : 'badge-gray'}`} title="Lights">
                          L: {item.lights ? 'ON' : 'OFF'}
                        </span>
                        <span className={`badge ${item.fans ? 'badge-green' : 'badge-gray'}`} title="Fans">
                          F: {item.fans ? 'ON' : 'OFF'}
                        </span>
                        <span className={`badge ${item.projector ? 'badge-green' : 'badge-gray'}`} title="Projector">
                          P: {item.projector ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <strong>{item.power_w} W</strong>
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, color: item.comfort_score >= 80 ? '#059669' : '#d97706' }}>
                        {item.comfort_score}
                      </span>
                    </td>

                    <td style={{ maxWidth: '380px' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.35, margin: 0 }}>
                        {item.reason}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
