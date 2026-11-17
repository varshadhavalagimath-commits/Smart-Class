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
  Zap,
  Wind,
  Check,
  X,
  AlertTriangle,
  Settings,
  Flame,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';

const ZONE_FAN_MAPPING = {
  'Zone A': [1, 2],
  'Zone B': [3, 4],
  'Zone C': [5, 6],
  'Zone D': [7, 8],
};

const FAN_LABELS = {
  1: { zone: 'Zone A', loc: 'Front Left #1' },
  2: { zone: 'Zone A', loc: 'Front Left #2' },
  3: { zone: 'Zone B', loc: 'Front Right #3' },
  4: { zone: 'Zone B', loc: 'Front Right #4' },
  5: { zone: 'Zone C', loc: 'Back Left #5' },
  6: { zone: 'Zone C', loc: 'Back Left #6' },
  7: { zone: 'Zone D', loc: 'Back Right #7' },
  8: { zone: 'Zone D', loc: 'Back Right #8' },
};

export default function ManualControlPanel({ 
  currentPercepts, 
  currentDevices,
  onApplyManual, 
  onResetDefault, 
  onStateUpdate,
  isLoading 
}) {
  // Active Tab
  const [activeTab, setActiveTab] = useState('zones'); // 'zones' | 'environment' | 'fans' | 'scenarios'

  // General Environment
  const [temperature, setTemperature] = useState(24.0);
  const [lightIntensity, setLightIntensity] = useState(400.0);
  const [activity, setActivity] = useState('Lecture');
  const [doorStatus, setDoorStatus] = useState('Closed');
  const [windowStatus, setWindowStatus] = useState('Closed');
  const [simulatedTime, setSimulatedTime] = useState('09:00 AM');

  // Zone Occupancies
  const [zoneA, setZoneA] = useState(15);
  const [zoneB, setZoneB] = useState(15);
  const [zoneC, setZoneC] = useState(0);
  const [zoneD, setZoneD] = useState(0);

  // Comfort Preferences per Zone
  const [zoneAPref, setZoneAPref] = useState('no_preference');
  const [zoneBPref, setZoneBPref] = useState('no_preference');
  const [zoneCPref, setZoneCPref] = useState('no_preference');
  const [zoneDPref, setZoneDPref] = useState('no_preference');

  // Teacher Controls
  const [teacherZone, setTeacherZone] = useState('Zone A');
  const [teacherPref, setTeacherPref] = useState('no_preference');
  const [teacherTargetFan, setTeacherTargetFan] = useState('none');

  const [validationError, setValidationError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [fanLoading, setFanLoading] = useState(false);

  // Initialize form fields ONCE on initial mount so polling does NOT overwrite user typing!
  useEffect(() => {
    if (currentPercepts && !hasInitialized) {
      setTemperature(currentPercepts.temperature ?? 24.0);
      setLightIntensity(currentPercepts.light_intensity ?? 400.0);
      setActivity(currentPercepts.activity ?? 'Lecture');
      setDoorStatus(currentPercepts.door_status ?? 'Closed');
      setWindowStatus(currentPercepts.window_status ?? 'Closed');
      setSimulatedTime(currentPercepts.simulated_time ?? '09:00 AM');

      const zones = currentPercepts.zones || {};
      setZoneA(zones['Zone A']?.students_count ?? 15);
      setZoneB(zones['Zone B']?.students_count ?? 15);
      setZoneC(zones['Zone C']?.students_count ?? 0);
      setZoneD(zones['Zone D']?.students_count ?? 0);

      setZoneAPref(zones['Zone A']?.student_preference ?? 'no_preference');
      setZoneBPref(zones['Zone B']?.student_preference ?? 'no_preference');
      setZoneCPref(zones['Zone C']?.student_preference ?? 'no_preference');
      setZoneDPref(zones['Zone D']?.student_preference ?? 'no_preference');

      setTeacherZone(currentPercepts.teacher_zone ?? 'Zone A');
      setTeacherPref(currentPercepts.teacher_preference ?? 'no_preference');
      setTeacherTargetFan(currentPercepts.teacher_target_fan ? String(currentPercepts.teacher_target_fan) : 'none');

      setHasInitialized(true);
    }
  }, [currentPercepts, hasInitialized]);

  const totalStudents = Math.max(0, parseInt(zoneA, 10) || 0) + 
                        Math.max(0, parseInt(zoneB, 10) || 0) + 
                        Math.max(0, parseInt(zoneC, 10) || 0) + 
                        Math.max(0, parseInt(zoneD, 10) || 0);

  // Quick sync from live sensor readings
  const handleSyncFromLive = () => {
    if (currentPercepts) {
      setTemperature(currentPercepts.temperature ?? 24.0);
      setLightIntensity(currentPercepts.light_intensity ?? 400.0);
      setActivity(currentPercepts.activity ?? 'Lecture');
      setDoorStatus(currentPercepts.door_status ?? 'Closed');
      setWindowStatus(currentPercepts.window_status ?? 'Closed');
      setSimulatedTime(currentPercepts.simulated_time ?? '09:00 AM');

      const zones = currentPercepts.zones || {};
      setZoneA(zones['Zone A']?.students_count ?? 0);
      setZoneB(zones['Zone B']?.students_count ?? 0);
      setZoneC(zones['Zone C']?.students_count ?? 0);
      setZoneD(zones['Zone D']?.students_count ?? 0);

      setZoneAPref(zones['Zone A']?.student_preference ?? 'no_preference');
      setZoneBPref(zones['Zone B']?.student_preference ?? 'no_preference');
      setZoneCPref(zones['Zone C']?.student_preference ?? 'no_preference');
      setZoneDPref(zones['Zone D']?.student_preference ?? 'no_preference');

      setTeacherZone(currentPercepts.teacher_zone ?? 'Zone A');
      setTeacherPref(currentPercepts.teacher_preference ?? 'no_preference');
      setTeacherTargetFan(currentPercepts.teacher_target_fan ? String(currentPercepts.teacher_target_fan) : 'none');

      setSuccessMessage('Synced manual inputs with live classroom state.');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleApply = async (e) => {
    e?.preventDefault();
    setValidationError('');
    setSuccessMessage('');

    const t = parseFloat(temperature);
    const l = parseFloat(lightIntensity);
    const za = Math.max(0, parseInt(zoneA, 10) || 0);
    const zb = Math.max(0, parseInt(zoneB, 10) || 0);
    const zc = Math.max(0, parseInt(zoneC, 10) || 0);
    const zd = Math.max(0, parseInt(zoneD, 10) || 0);
    const total = za + zb + zc + zd;

    if (isNaN(t) || t < 15 || t > 45) {
      setValidationError('Temperature must be between 15°C and 45°C.');
      return;
    }
    if (isNaN(l) || l < 0 || l > 1000) {
      setValidationError('Light intensity must be between 0 and 1000 lux.');
      return;
    }
    if (total > 100) {
      setValidationError('Total classroom students across all zones cannot exceed 100.');
      return;
    }

    const trimmedTime = simulatedTime ? simulatedTime.trim() : '09:00 AM';

    const payload = {
      students_count: total,
      temperature: t,
      light_intensity: l,
      activity,
      door_status: doorStatus,
      window_status: windowStatus,
      simulated_time: trimmedTime,
      zone_occupancy: {
        'Zone A': za,
        'Zone B': zb,
        'Zone C': zc,
        'Zone D': zd,
      },
      student_preferences: {
        'Zone A': zoneAPref,
        'Zone B': zoneBPref,
        'Zone C': zoneCPref,
        'Zone D': zoneDPref,
      },
      teacher_present_zone: teacherZone,
      teacher_preference: teacherPref,
      teacher_target_fan: teacherTargetFan !== 'none' ? parseInt(teacherTargetFan, 10) : null,
    };

    try {
      const newState = await onApplyManual(payload);
      if (onStateUpdate && newState) {
        onStateUpdate(newState);
      }
      setSuccessMessage(`Changes applied! Occupancy: ${total} st (A:${za}, B:${zb}, C:${zc}, D:${zd}), Temp: ${t}°C. Dynamic zone decisions calculated.`);
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err) {
      setValidationError(err.message || 'Failed to apply manual changes');
    }
  };

  // Direct Fan Control Handlers
  const handleToggleFanAvailability = async (fanId, currentAvailable) => {
    setFanLoading(true);
    try {
      const newState = await api.setFanAvailability(fanId, !currentAvailable);
      if (onStateUpdate && newState) {
        onStateUpdate(newState);
      }
      setSuccessMessage(`Fan ${fanId} marked as ${!currentAvailable ? 'Available' : 'Faulty/Unavailable'}. Automatic fallback evaluated.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setValidationError(`Failed to update Fan ${fanId} availability: ${err.message}`);
    } finally {
      setFanLoading(false);
    }
  };

  const handleSetFanOverride = async (fanId, overrideValue) => {
    setFanLoading(true);
    try {
      const newState = await api.setFanOverride(fanId, overrideValue);
      if (onStateUpdate && newState) {
        onStateUpdate(newState);
      }
      const label = overrideValue === true ? 'Force ON' : overrideValue === false ? 'Force OFF' : 'Auto';
      setSuccessMessage(`Fan ${fanId} manual override set to: ${label}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setValidationError(`Failed to set Fan ${fanId} override: ${err.message}`);
    } finally {
      setFanLoading(false);
    }
  };

  const handleResetAllOverrides = async () => {
    setFanLoading(true);
    try {
      const newState = await api.resetAllFanOverrides();
      if (onStateUpdate && newState) {
        onStateUpdate(newState);
      }
      setSuccessMessage('All 8 fans reset to Autonomous Intelligent Control.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setValidationError(`Failed to reset overrides: ${err.message}`);
    } finally {
      setFanLoading(false);
    }
  };

  // Preset Scenarios from Requirements
  const applyScenario = async (scenarioType) => {
    let za = 0, zb = 0, zc = 0, zd = 0;
    let t = 24.0, l = 400.0, act = 'Lecture', time = '10:00 AM';
    let zaP = 'no_preference', zbP = 'no_preference', zcP = 'no_preference', zdP = 'no_preference';
    let tZ = 'Zone A', tP = 'no_preference', tF = null;

    if (scenarioType === 'scenario1') {
      // Scenario 1: Cold temp (20°C) with Zone A student fan request
      t = 20.0;
      za = 10; zb = 0; zc = 0; zd = 0;
      zaP = 'on';
      tZ = 'None';
      time = '08:30 AM';
    } else if (scenarioType === 'scenario2') {
      // Scenario 2: Hot temp (32°C) with students in two zones (A=15, B=10)
      t = 32.0;
      za = 15; zb = 10; zc = 0; zd = 0;
      tZ = 'Zone A';
      time = '11:15 AM';
    } else if (scenarioType === 'scenario3') {
      // Scenario 3: Hot temp (32°C) with students in all four zones
      t = 32.0;
      za = 12; zb = 10; zc = 8; zd = 10;
      tZ = 'Zone A';
      time = '02:00 PM';
    } else if (scenarioType === 'scenario4') {
      // Scenario 4: Cold temp (19°C) with students, no fan request
      t = 19.0;
      za = 15; zb = 15; zc = 0; zd = 0;
      zaP = 'no_preference'; zbP = 'no_preference';
      tZ = 'Zone A'; tP = 'no_preference';
      time = '09:00 AM';
    } else if (scenarioType === 'scenario5') {
      // Scenario 5: Teacher in Zone A requests Fan 1 ON (22°C)
      t = 22.0;
      za = 8; zb = 5; zc = 0; zd = 0;
      tZ = 'Zone A';
      tP = 'on';
      tF = 1;
      time = '10:00 AM';
    } else if (scenarioType === 'scenario6') {
      // Scenario 6: Classroom becomes completely empty
      t = 28.0;
      za = 0; zb = 0; zc = 0; zd = 0;
      tZ = 'None';
      act = 'No class';
      time = '04:30 PM';
    } else if (scenarioType === 'conflict') {
      // Scenario 7: Conflict test (Teacher in Zone A requests OFF, Students request ON)
      t = 30.0;
      za = 15; zb = 10; zc = 0; zd = 0;
      zaP = 'on'; // Students want fan ON
      tZ = 'Zone A';
      tP = 'off'; // Teacher requests fan OFF -> Teacher priority rule!
      time = '11:00 AM';
    }

    setTemperature(t);
    setLightIntensity(l);
    setActivity(act);
    setSimulatedTime(time);
    setZoneA(za); setZoneB(zb); setZoneC(zc); setZoneD(zd);
    setZoneAPref(zaP); setZoneBPref(zbP); setZoneCPref(zcP); setZoneDPref(zdP);
    setTeacherZone(tZ); setTeacherPref(tP); setTeacherTargetFan(tF ? String(tF) : 'none');

    // Auto-apply scenario
    try {
      const newState = await onApplyManual({
        students_count: za + zb + zc + zd,
        temperature: t,
        light_intensity: l,
        activity: act,
        door_status: 'Closed',
        window_status: 'Closed',
        simulated_time: time,
        zone_occupancy: { 'Zone A': za, 'Zone B': zb, 'Zone C': zc, 'Zone D': zd },
        student_preferences: { 'Zone A': zaP, 'Zone B': zbP, 'Zone C': zcP, 'Zone D': zdP },
        teacher_present_zone: tZ,
        teacher_preference: tP,
        teacher_target_fan: tF,
      });
      if (onStateUpdate && newState) {
        onStateUpdate(newState);
      }
      setSuccessMessage(`Preset Applied: ${scenarioType.toUpperCase()}! Decision evaluated immediately.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setValidationError(err.message || 'Failed to apply preset scenario');
    }
  };

  const fanStates = currentDevices?.fan_states || {};
  const fanAvail = currentDevices?.fan_availability || {};
  const fanOverrides = currentDevices?.fan_overrides || {};

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={20} color="var(--primary-blue)" />
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
            Mode B: Zone & Fan Control Hub
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleSyncFromLive}
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
            title="Copy current live sensor percepts into this form"
          >
            Copy Live
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Manage 4 distinct classroom zones, 8 individual ceiling fans, student/teacher comfort requests, and environmental conditions.
      </p>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem',
        marginBottom: '1rem',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('zones')}
          className={`btn btn-sm ${activeTab === 'zones' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
        >
          <Users size={13} />
          <span>4 Zones & Occupancy ({totalStudents} st)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fans')}
          className={`btn btn-sm ${activeTab === 'fans' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
        >
          <Wind size={13} />
          <span>8 Fans Grid & Overrides</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('environment')}
          className={`btn btn-sm ${activeTab === 'environment' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
        >
          <Thermometer size={13} />
          <span>Climate & Time ({temperature}°C)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('scenarios')}
          className={`btn btn-sm ${activeTab === 'scenarios' ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
        >
          <Flame size={13} color="#f97316" />
          <span>⚡ 1-Click Tests</span>
        </button>
      </div>

      {/* Alerts */}
      {validationError && (
        <div style={{
          padding: '0.6rem 0.85rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#b91c1c',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <AlertCircle size={15} />
          <span>{validationError}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '0.6rem 0.85rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          color: '#059669',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <CheckCircle2 size={15} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleApply}>
        {/* TAB 1: 4 ZONES & OCCUPANCY */}
        {activeTab === 'zones' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                Zone Occupancy (Total: <strong>{totalStudents}</strong> Students)
              </span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}
                  onClick={() => { setZoneA(10); setZoneB(10); setZoneC(10); setZoneD(10); }}
                >
                  All (40)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}
                  onClick={() => { setZoneA(15); setZoneB(10); setZoneC(0); setZoneD(0); }}
                >
                  Front (A+B)
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}
                  onClick={() => { setZoneA(0); setZoneB(0); setZoneC(0); setZoneD(0); setTeacherZone('None'); }}
                >
                  Clear (0)
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              {/* Zone A */}
              <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#1e3a8a' }}>Zone A (Front Left)</strong>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>Fans 1 & 2</span>
                </div>
                <div className="form-group" style={{ marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Students Count</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="form-input"
                    value={zoneA}
                    onChange={(e) => setZoneA(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Student Fan Request</label>
                  <select
                    className="form-select"
                    value={zoneAPref}
                    onChange={(e) => setZoneAPref(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                  >
                    <option value="no_preference">No preference</option>
                    <option value="on">Request Fan ON</option>
                    <option value="off">Request Fan OFF</option>
                  </select>
                </div>
              </div>

              {/* Zone B */}
              <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#1e3a8a' }}>Zone B (Front Right)</strong>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>Fans 3 & 4</span>
                </div>
                <div className="form-group" style={{ marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Students Count</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="form-input"
                    value={zoneB}
                    onChange={(e) => setZoneB(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Student Fan Request</label>
                  <select
                    className="form-select"
                    value={zoneBPref}
                    onChange={(e) => setZoneBPref(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                  >
                    <option value="no_preference">No preference</option>
                    <option value="on">Request Fan ON</option>
                    <option value="off">Request Fan OFF</option>
                  </select>
                </div>
              </div>

              {/* Zone C */}
              <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#1e3a8a' }}>Zone C (Back Left)</strong>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>Fans 5 & 6</span>
                </div>
                <div className="form-group" style={{ marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Students Count</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="form-input"
                    value={zoneC}
                    onChange={(e) => setZoneC(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Student Fan Request</label>
                  <select
                    className="form-select"
                    value={zoneCPref}
                    onChange={(e) => setZoneCPref(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                  >
                    <option value="no_preference">No preference</option>
                    <option value="on">Request Fan ON</option>
                    <option value="off">Request Fan OFF</option>
                  </select>
                </div>
              </div>

              {/* Zone D */}
              <div style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <strong style={{ fontSize: '0.82rem', color: '#1e3a8a' }}>Zone D (Back Right)</strong>
                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>Fans 7 & 8</span>
                </div>
                <div className="form-group" style={{ marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Students Count</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    className="form-input"
                    value={zoneD}
                    onChange={(e) => setZoneD(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.82rem' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Student Fan Request</label>
                  <select
                    className="form-select"
                    value={zoneDPref}
                    onChange={(e) => setZoneDPref(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                  >
                    <option value="no_preference">No preference</option>
                    <option value="on">Request Fan ON</option>
                    <option value="off">Request Fan OFF</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Teacher Seating & Preferences */}
            <div style={{
              padding: '0.75rem 0.9rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <UserCheck size={16} color="#1d4ed8" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e3a8a' }}>
                  Teacher Presence & Directed Requests (Higher Priority in instructional zone)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Teacher Location</label>
                  <select
                    className="form-select"
                    value={teacherZone}
                    onChange={(e) => setTeacherZone(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                  >
                    <option value="Zone A">Zone A (Front Left)</option>
                    <option value="Zone B">Zone B (Front Right)</option>
                    <option value="Zone C">Zone C (Back Left)</option>
                    <option value="Zone D">Zone D (Back Right)</option>
                    <option value="None">None (Teacher Absent)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Teacher Fan Preference</label>
                  <select
                    className="form-select"
                    value={teacherPref}
                    onChange={(e) => setTeacherPref(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                  >
                    <option value="no_preference">No preference</option>
                    <option value="on">Request Fan ON</option>
                    <option value="off">Request Fan OFF</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Target Specific Fan</label>
                  <select
                    className="form-select"
                    value={teacherTargetFan}
                    onChange={(e) => setTeacherTargetFan(e.target.value)}
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.78rem' }}
                  >
                    <option value="none">Any in zone</option>
                    <option value="1">Fan 1 (Zone A)</option>
                    <option value="2">Fan 2 (Zone A)</option>
                    <option value="3">Fan 3 (Zone B)</option>
                    <option value="4">Fan 4 (Zone B)</option>
                    <option value="5">Fan 5 (Zone C)</option>
                    <option value="6">Fan 6 (Zone C)</option>
                    <option value="7">Fan 7 (Zone D)</option>
                    <option value="8">Fan 8 (Zone D)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 8 FANS GRID & MANUAL OVERRIDES */}
        {activeTab === 'fans' && (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: '8px'
            }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                  Individual Fan Hardware Controls (60W per Fan)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  Active: {currentDevices?.active_fan_count || 0}/8 ({currentDevices?.fan_power_w || 0} W)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleResetAllOverrides}
                disabled={fanLoading}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
              >
                Reset All to Auto
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((fanId) => {
                const meta = FAN_LABELS[fanId];
                const isOn = !!fanStates[fanId];
                const isAvail = fanAvail[fanId] !== false;
                const override = fanOverrides[fanId];

                return (
                  <div
                    key={fanId}
                    style={{
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: !isAvail ? '1.5px dashed #fca5a5' : isOn ? '1.5px solid #60a5fa' : '1px solid var(--border-color)',
                      backgroundColor: !isAvail ? '#fef2f2' : isOn ? '#f0f9ff' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Wind
                          size={15}
                          color={isOn ? '#0284c7' : '#94a3b8'}
                          className={isOn ? 'fan-spinning' : ''}
                        />
                        <strong style={{ fontSize: '0.8rem', color: 'var(--primary-navy)' }}>
                          Fan {fanId}
                        </strong>
                      </div>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>
                        {meta.loc}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                      <span>Status:</span>
                      <span className={`badge ${!isAvail ? 'badge-red' : isOn ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                        {!isAvail ? 'FAULTY' : isOn ? 'ON (60W)' : 'OFF'}
                      </span>
                    </div>

                    {/* Hardware Availability Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                      <span>Availability:</span>
                      <button
                        type="button"
                        onClick={() => handleToggleFanAvailability(fanId, isAvail)}
                        disabled={fanLoading}
                        className={`btn btn-sm ${isAvail ? 'btn-outline' : 'btn-danger'}`}
                        style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                      >
                        {isAvail ? 'Available' : 'Faulty'}
                      </button>
                    </div>

                    {/* Manual Override: Auto | Force ON | Force OFF */}
                    <div style={{ display: 'flex', gap: '0.2rem', marginTop: '0.2rem' }}>
                      <button
                        type="button"
                        onClick={() => handleSetFanOverride(fanId, null)}
                        disabled={fanLoading}
                        className={`btn btn-sm ${override === null || override === undefined ? 'btn-primary' : 'btn-outline'}`}
                        style={{ flex: 1, fontSize: '0.65rem', padding: '0.15rem 0' }}
                        title="Autonomous Intelligent Control"
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetFanOverride(fanId, true)}
                        disabled={fanLoading || !isAvail}
                        className={`btn btn-sm ${override === true ? 'btn-primary' : 'btn-outline'}`}
                        style={{ flex: 1, fontSize: '0.65rem', padding: '0.15rem 0' }}
                        title="Force fan ON"
                      >
                        ON
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetFanOverride(fanId, false)}
                        disabled={fanLoading}
                        className={`btn btn-sm ${override === false ? 'btn-primary' : 'btn-outline'}`}
                        style={{ flex: 1, fontSize: '0.65rem', padding: '0.15rem 0' }}
                        title="Force fan OFF"
                      >
                        OFF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CLIMATE & TIME */}
        {activeTab === 'environment' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
            {/* Temperature */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Thermometer size={14} color="#ef4444" />
                <span>Temp (15–45°C)</span>
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
                <span>Activity</span>
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
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
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
                style={{ marginBottom: '0.4rem' }}
              />
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {['08:00 AM', '09:00 AM', '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM', '04:00 PM'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSimulatedTime(t)}
                    className={`btn btn-sm ${simulatedTime === t ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.68rem', padding: '0.15rem 0.4rem' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 1-CLICK TEST SCENARIOS */}
        {activeTab === 'scenarios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Click any scenario to instantly apply its inputs and verify intelligent zone fan actuation:
            </p>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => applyScenario('scenario1')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.55rem 0.75rem' }}
            >
              <div>
                <strong style={{ color: '#0284c7', fontSize: '0.82rem' }}>Scenario 1: Cold (20°C) with Zone A Student Request</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Expect: Fans in Zone A ON; Fans in other zones remain OFF.
                </div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => applyScenario('scenario2')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.55rem 0.75rem' }}
            >
              <div>
                <strong style={{ color: '#ea580c', fontSize: '0.82rem' }}>Scenario 2: Hot (32°C) with Students in Zones A & B Only</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Expect: Fans in Zones A & B ON; Fans in unoccupied Zones C & D remain OFF (energy saved).
                </div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => applyScenario('scenario3')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.55rem 0.75rem' }}
            >
              <div>
                <strong style={{ color: '#ea580c', fontSize: '0.82rem' }}>Scenario 3: Hot (32°C) with All 4 Zones Occupied</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Expect: Active fans in all 4 occupied zones tailored to density.
                </div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => applyScenario('scenario4')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.55rem 0.75rem' }}
            >
              <div>
                <strong style={{ color: '#0369a1', fontSize: '0.82rem' }}>Scenario 4: Cold (19°C) with Students & No Fan Request</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Expect: All fans remain OFF to avoid thermal discomfort.
                </div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => applyScenario('scenario5')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.55rem 0.75rem' }}
            >
              <div>
                <strong style={{ color: '#7c3aed', fontSize: '0.82rem' }}>Scenario 5: Teacher in Zone A Requests Fan 1 ON (22°C)</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Expect: Fan 1 turns ON specifically; other fans governed by their zone rules.
                </div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => applyScenario('scenario6')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.55rem 0.75rem' }}
            >
              <div>
                <strong style={{ color: '#64748b', fontSize: '0.82rem' }}>Scenario 6: Classroom Empty (0 Students & Teachers)</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Expect: Complete automated shutdown of all fans, lights, and projector.
                </div>
              </div>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => applyScenario('conflict')}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.55rem 0.75rem' }}
            >
              <div>
                <strong style={{ color: '#b91c1c', fontSize: '0.82rem' }}>Scenario 7: Conflict Resolution (Teacher Priority)</strong>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Students request ON, Teacher requests OFF in same zone. Expect: Teacher priority honored.
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ flex: 1, minWidth: '160px' }}
          >
            <Zap size={16} />
            <span>APPLY MANUAL CHANGES</span>
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
