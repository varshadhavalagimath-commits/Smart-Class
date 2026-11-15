import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Thermometer, 
  Sun, 
  Users, 
  Clock, 
  BookOpen, 
  DoorClosed,
  Zap
} from 'lucide-react';

export default function ManualControlPanel({ 
  currentPercepts, 
  onApplyManual, 
  onResetDefault, 
  isLoading 
}) {
  const [students, setStudents] = useState(30);
  const [temperature, setTemperature] = useState(24.0);
  const [lightIntensity, setLightIntensity] = useState(400.0);
  const [activity, setActivity] = useState('Lecture');
  const [doorStatus, setDoorStatus] = useState('Closed');
  const [windowStatus, setWindowStatus] = useState('Closed');
  const [simulatedTime, setSimulatedTime] = useState('09:00 AM');
  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sync with incoming percepts when currentPercepts changes
  useEffect(() => {
    if (currentPercepts) {
      setStudents(currentPercepts.students_count ?? 0);
      setTemperature(currentPercepts.temperature ?? 24.0);
      setLightIntensity(currentPercepts.light_intensity ?? 400.0);
      setActivity(currentPercepts.activity ?? 'Lecture');
      setDoorStatus(currentPercepts.door_status ?? 'Closed');
      setWindowStatus(currentPercepts.window_status ?? 'Closed');
      setSimulatedTime(currentPercepts.simulated_time ?? '09:00 AM');
    }
  }, [currentPercepts]);

  const handleApply = async (e) => {
    e?.preventDefault();
    setValidationError('');
    setSuccessMessage('');

    // Form validation
    const s = parseInt(students, 10);
    const t = parseFloat(temperature);
    const l = parseFloat(lightIntensity);

    if (isNaN(s) || s < 0 || s > 100) {
      setValidationError('Student count must be between 0 and 100.');
      return;
    }
    if (isNaN(t) || t < 15 || t > 45) {
      setValidationError('Temperature must be between 15°C and 45°C.');
      return;
    }
    if (isNaN(l) || l < 0 || l > 1000) {
      setValidationError('Light intensity must be between 0 and 1000 lux.');
      return;
    }

    try {
      await onApplyManual({
        students_count: s,
        temperature: t,
        light_intensity: l,
        activity,
        door_status: doorStatus,
        window_status: windowStatus,
        simulated_time: simulatedTime,
      });
      setSuccessMessage('Manual parameters applied! Agent evaluated updated percepts.');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      setValidationError(err.message || 'Failed to apply manual input');
    }
  };

  const handleQuickPreset = (preset) => {
    if (preset === 'hot') {
      setStudents(35);
      setTemperature(35.0);
      setLightIntensity(450.0);
      setActivity('Lecture');
    } else if (preset === 'vacant') {
      setStudents(0);
      setActivity('No class');
    } else if (preset === 'dark') {
      setStudents(30);
      setLightIntensity(80.0);
      setActivity('Lecture');
    } else if (preset === 'lab') {
      setStudents(28);
      setTemperature(23.0);
      setLightIntensity(350.0);
      setActivity('Lab');
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={20} color="var(--primary-blue)" />
          <span>Mode B: Manual Entry Control</span>
        </div>
        <span className="badge badge-blue">Interactive Override</span>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Directly configure environmental parameters. The active rational agent will immediately compute device actions and justify its decision.
      </p>

      {/* Quick Test Scenarios */}
      <div style={{
        marginBottom: '1.25rem',
        padding: '0.75rem',
        backgroundColor: 'var(--bg-subtle)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
          ⚡ Key Test Scenarios:
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-outline btn-sm" 
            onClick={() => handleQuickPreset('hot')}
            title="Sets temperature to 35°C to test fan cooling decision"
          >
            🔥 High Temp (35°C)
          </button>
          <button 
            type="button" 
            className="btn btn-outline btn-sm" 
            onClick={() => handleQuickPreset('vacant')}
            title="Sets students to 0 to test automated shutdown"
          >
            🚪 Vacant Room (0 St.)
          </button>
          <button 
            type="button" 
            className="btn btn-outline btn-sm" 
            onClick={() => handleQuickPreset('dark')}
            title="Sets ambient lux to 80 to test lighting threshold"
          >
            🌙 Dim Room (80 Lux)
          </button>
          <button 
            type="button" 
            className="btn btn-outline btn-sm" 
            onClick={() => handleQuickPreset('lab')}
            title="Sets activity to Lab session"
          >
            💻 Lab Session
          </button>
        </div>
      </div>

      {validationError && (
        <div style={{
          padding: '0.65rem 0.85rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#b91c1c',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <AlertCircle size={16} />
          <span>{validationError}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '0.65rem 0.85rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          color: '#059669',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleApply}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {/* Students */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Users size={14} color="var(--primary-blue)" />
              <span>Students (0–100)</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              className="form-input"
              value={students}
              onChange={(e) => setStudents(e.target.value)}
              required
            />
          </div>

          {/* Temperature */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Thermometer size={14} color="#ef4444" />
              <span>Temperature (15–45°C)</span>
            </label>
            <input
              type="number"
              min="15"
              max="45"
              step="0.5"
              className="form-input"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              required
            />
          </div>

          {/* Light Intensity */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Sun size={14} color="#eab308" />
              <span>Light (0–1000 lux)</span>
            </label>
            <input
              type="number"
              min="0"
              max="1000"
              step="10"
              className="form-input"
              value={lightIntensity}
              onChange={(e) => setLightIntensity(e.target.value)}
              required
            />
          </div>

          {/* Activity */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <BookOpen size={14} color="var(--primary-navy)" />
              <span>Classroom Activity</span>
            </label>
            <select
              className="form-select"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
            >
              <option value="Lecture">Lecture</option>
              <option value="Lab">Lab</option>
              <option value="Break">Break</option>
              <option value="No class">No class</option>
            </select>
          </div>

          {/* Door */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <DoorClosed size={14} color="var(--primary-navy)" />
              <span>Door Status</span>
            </label>
            <select
              className="form-select"
              value={doorStatus}
              onChange={(e) => setDoorStatus(e.target.value)}
            >
              <option value="Closed">Closed</option>
              <option value="Open">Open</option>
            </select>
          </div>

          {/* Window */}
          <div className="form-group">
            <label className="form-label">Window Status</label>
            <select
              className="form-select"
              value={windowStatus}
              onChange={(e) => setWindowStatus(e.target.value)}
            >
              <option value="Closed">Closed</option>
              <option value="Open">Open</option>
            </select>
          </div>

          {/* Simulated Time */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={14} color="var(--text-muted)" />
              <span>Simulated Time</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={simulatedTime}
              onChange={(e) => setSimulatedTime(e.target.value)}
              placeholder="e.g. 10:30 AM"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ flex: 1, minWidth: '160px' }}
          >
            <Zap size={16} />
            <span>APPLY CHANGES</span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onResetDefault}
            disabled={isLoading}
          >
            <RotateCcw size={16} />
            <span>RESET TO DEFAULT</span>
          </button>
        </div>
      </form>
    </div>
  );
}
