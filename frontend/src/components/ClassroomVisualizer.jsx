import React from 'react';
import { 
  Users, 
  Sun, 
  Thermometer, 
  Lightbulb, 
  Wind, 
  Video, 
  DoorClosed, 
  DoorOpen,
  Sparkles,
  Layers,
  GraduationCap,
  AlertTriangle,
  Lock,
  CheckCircle2
} from 'lucide-react';

export default function ClassroomVisualizer({ percepts, devices, activeAgent, lastDecision }) {
  const isOccupied = percepts?.is_occupied ?? (percepts?.students_count > 0);
  const lightsOn = devices?.lights ?? false;
  const projectorOn = devices?.projector ?? false;
  const temp = percepts?.temperature ?? 24.0;
  const lux = percepts?.light_intensity ?? 400.0;
  const totalStudents = percepts?.students_count ?? 0;
  const isDoorOpen = percepts?.door_status === 'Open';
  const isWindowOpen = percepts?.window_status === 'Open';
  const activity = percepts?.activity || 'Lecture';

  const fanStates = devices?.fan_states || {};
  const fanAvail = percepts?.fan_availability || devices?.fan_availability || {};
  const fanOverrides = percepts?.fan_manual_overrides || devices?.fan_overrides || {};
  const activeFanCount = devices?.active_fan_count ?? 0;
  const fanPowerW = devices?.fan_power_w ?? (activeFanCount * 60.0);

  const zones = percepts?.zones || {
    "Zone A": { zone_id: "Zone A", name: "Front Left", students_count: 0, teacher_present: false, student_preference: "no_preference", teacher_preference: "no_preference" },
    "Zone B": { zone_id: "Zone B", name: "Front Right", students_count: 0, teacher_present: false, student_preference: "no_preference", teacher_preference: "no_preference" },
    "Zone C": { zone_id: "Zone C", name: "Back Left", students_count: 0, teacher_present: false, student_preference: "no_preference", teacher_preference: "no_preference" },
    "Zone D": { zone_id: "Zone D", name: "Back Right", students_count: 0, teacher_present: false, student_preference: "no_preference", teacher_preference: "no_preference" },
  };

  const effectiveLux = lux + (lightsOn ? 320 : 0);
  const brightnessFilter = Math.min(1.15, Math.max(0.7, effectiveLux / 500));

  const isHot = temp > 26.0;
  const isCold = temp < 22.0;
  const tempColor = isHot ? '#ef4444' : isCold ? '#3b82f6' : '#10b981';

  // Zone configuration mapping
  const zoneList = [
    { id: "Zone A", label: "Zone A – Front Left", fans: [1, 2] },
    { id: "Zone B", label: "Zone B – Front Right", fans: [3, 4] },
    { id: "Zone C", label: "Zone C – Back Left", fans: [5, 6] },
    { id: "Zone D", label: "Zone D – Back Right", fans: [7, 8] },
  ];

  return (
    <div className="classroom-visualizer-card">
      {/* Visualizer Header HUD */}
      <div style={{
        padding: '0.85rem 1.25rem',
        backgroundColor: '#0f172a',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <Layers size={14} color="#38bdf8" />
            <span>Agent: {lastDecision?.agent_name || activeAgent}</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <span style={{ color: '#94a3b8' }}>Session:</span>
            <span style={{ color: '#facc15' }}>{activity}</span>
          </div>
        </div>

        {/* Real-time Environment Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#f8fafc',
            backgroundColor: 'rgba(0,0,0,0.35)',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px'
          }}>
            <Users size={14} color="#60a5fa" />
            <span>{totalStudents} Students ({isOccupied ? 'Occupied' : 'Vacant'})</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: tempColor,
            backgroundColor: 'rgba(0,0,0,0.35)',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            fontWeight: 700
          }}>
            <Thermometer size={14} color={tempColor} />
            <span>{temp.toFixed(1)}°C</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#fef08a',
            backgroundColor: 'rgba(0,0,0,0.35)',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px'
          }}>
            <Sun size={14} color="#facc15" />
            <span>{lux.toFixed(0)} Lux</span>
          </div>

          {/* Active Fans Chip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: activeFanCount > 0 ? '#38bdf8' : '#94a3b8',
            backgroundColor: 'rgba(0,0,0,0.35)',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            fontWeight: 700
          }}>
            <Wind size={14} color={activeFanCount > 0 ? '#38bdf8' : '#94a3b8'} className={activeFanCount > 0 ? 'fan-spinning' : ''} />
            <span>Fans: {activeFanCount}/8 Active ({fanPowerW}W)</span>
          </div>
        </div>
      </div>

      {/* Main 2D Stage with 4 ZONES and 8 CEILING FANS */}
      <div style={{
        position: 'relative',
        minHeight: '520px',
        backgroundColor: '#cbd5e1',
        overflow: 'hidden',
        filter: `brightness(${brightnessFilter})`,
        transition: 'filter 0.5s ease',
        backgroundImage: 'linear-gradient(to bottom, #94a3b8 0%, #cbd5e1 35%, #475569 100%)',
        padding: '12px'
      }}>
        {/* Ambient Light Overlay when Lights ON */}
        {lightsOn && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 25%, rgba(254, 240, 138, 0.3) 0%, rgba(253, 224, 71, 0.1) 60%, transparent 85%)',
            pointerEvents: 'none',
            zIndex: 15
          }} />
        )}

        {/* ================= TOP WALL: BOARD, PROJECTOR, LIGHTS ================= */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Left Window */}
          <div style={{
            width: '80px',
            height: '55px',
            backgroundColor: lux > 500 ? '#bae6fd' : lux > 250 ? '#93c5fd' : '#475569',
            border: '3px solid #1e293b',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '0.62rem',
            fontWeight: 700,
            color: '#0f172a'
          }}>
            <span>{isWindowOpen ? 'Window Open' : 'Window Closed'}</span>
            <span style={{ fontSize: '0.55rem', color: '#334155' }}>{lux.toFixed(0)} Lux</span>
          </div>

          {/* Center: Smart Whiteboard & Projector */}
          <div style={{
            width: '320px',
            height: '75px',
            backgroundColor: projectorOn ? '#0f172a' : '#f8fafc',
            border: '4px solid #334155',
            borderRadius: '6px',
            boxShadow: projectorOn ? '0 0 25px rgba(59, 130, 246, 0.5)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: projectorOn ? '#38bdf8' : '#64748b',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}>
            {projectorOn ? (
              <div style={{ textAlign: 'center', padding: '0.2rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#93c5fd' }}>
                  📺 {activity === 'Lab' ? 'Lab Exercise: Smart Energy Agent' : 'Lecture: Zone-Based Dynamic Fan Agent'}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>
                  Projector ON (250 W) — High Utility Media
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>Whiteboard (Projector Standby - 0W)</span>
              </div>
            )}
          </div>

          {/* Right: Door */}
          <div style={{
            width: '65px',
            height: '65px',
            backgroundColor: isDoorOpen ? '#334155' : '#78350f',
            border: '3px solid #1e293b',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '0.62rem',
            fontWeight: 700,
            color: '#fef3c7'
          }}>
            {isDoorOpen ? <DoorOpen size={18} color="#fbbf24" /> : <DoorClosed size={18} color="#cbd5e1" />}
            <span>{isDoorOpen ? 'Door Open' : 'Door Closed'}</span>
          </div>
        </div>

        {/* Lights Indicator Strip */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: '10px',
          position: 'relative',
          zIndex: 10
        }}>
          {['Ceiling Light Left (200W)', 'Ceiling Light Right (200W)'].map((lName, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: lightsOn ? '#fef08a' : '#f1f5f9',
              border: lightsOn ? '2px solid #eab308' : '1px solid #cbd5e1',
              borderRadius: '20px',
              padding: '0.2rem 0.75rem',
              boxShadow: lightsOn ? '0 0 15px rgba(250, 204, 21, 0.7)' : 'none',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: lightsOn ? '#854d0e' : '#64748b'
            }}>
              <Lightbulb size={12} color={lightsOn ? '#ca8a04' : '#64748b'} />
              <span>{lightsOn ? 'LIGHTS ON (400W Total)' : 'LIGHTS OFF (0W)'}</span>
            </div>
          ))}
        </div>

        {/* ================= 4 CLASSROOM ZONES GRID (2x2 MATRIX) ================= */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          position: 'relative',
          zIndex: 12
        }}>
          {zoneList.map((zConfig) => {
            const zData = zones[zConfig.id] || { students_count: 0, teacher_present: false, student_preference: 'no_preference', teacher_preference: 'no_preference' };
            const isZoneOccupied = zData.students_count > 0 || zData.teacher_present;
            const hasPrefOn = zData.student_preference === 'on' || zData.teacher_preference === 'on';
            const hasPrefOff = zData.student_preference === 'off' || zData.teacher_preference === 'off';

            return (
              <div
                key={zConfig.id}
                style={{
                  backgroundColor: isZoneOccupied ? 'rgba(255, 255, 255, 0.92)' : 'rgba(241, 245, 249, 0.75)',
                  border: isZoneOccupied ? '2px solid #3b82f6' : '1px dashed #94a3b8',
                  borderRadius: '10px',
                  padding: '10px',
                  boxShadow: isZoneOccupied ? '0 4px 14px rgba(59, 130, 246, 0.15)' : 'none',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
              >
                {/* Zone Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '6px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                      {zConfig.label}
                    </span>
                    {zData.teacher_present && (
                      <span className="badge badge-orange" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                        <GraduationCap size={10} style={{ marginRight: '2px' }} />
                        Teacher
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className={`badge ${isZoneOccupied ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: '0.68rem' }}>
                      <Users size={10} style={{ marginRight: '3px' }} />
                      {zData.students_count} Students
                    </span>

                    {/* Preference chip */}
                    {hasPrefOn && (
                      <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>
                        Req: ON
                      </span>
                    )}
                    {hasPrefOff && (
                      <span className="badge badge-red" style={{ fontSize: '0.62rem' }}>
                        Req: OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* Ceiling Fans in this Zone */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  {zConfig.fans.map((fanId) => {
                    const isFanOn = fanStates[fanId] ?? false;
                    const isAvailable = fanAvail[fanId] ?? true;
                    const override = fanOverrides[fanId];
                    const isOverridden = override !== null && override !== undefined;

                    return (
                      <div
                        key={fanId}
                        style={{
                          backgroundColor: !isAvailable ? '#fef2f2' : (isFanOn ? '#e0f2fe' : '#f8fafc'),
                          border: !isAvailable ? '1.5px solid #f87171' : (isFanOn ? '1.5px solid #38bdf8' : '1px solid #cbd5e1'),
                          borderRadius: '8px',
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isFanOn ? '0 0 10px rgba(56, 189, 248, 0.4)' : 'none',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: isFanOn ? '#0284c7' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff'
                          }}>
                            <Wind size={16} className={isFanOn ? 'fan-spinning' : ''} />
                          </div>

                          <div>
                            <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                              Fan {fanId}
                            </div>
                            <div style={{ fontSize: '0.62rem', color: isFanOn ? '#0284c7' : '#64748b', fontWeight: 600 }}>
                              {isFanOn ? '60 W (Spinning)' : '0 W (OFF)'}
                            </div>
                          </div>
                        </div>

                        {/* Status badges */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          {!isAvailable ? (
                            <span style={{ fontSize: '0.58rem', fontWeight: 800, color: '#dc2626', backgroundColor: '#fee2e2', padding: '1px 4px', borderRadius: '4px' }}>
                              FAULTY
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              color: isFanOn ? '#0369a1' : '#64748b',
                              backgroundColor: isFanOn ? '#bae6fd' : '#e2e8f0',
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}>
                              {isFanOn ? 'ON' : 'OFF'}
                            </span>
                          )}

                          {isOverridden && (
                            <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#b45309', backgroundColor: '#fef3c7', padding: '1px 3px', borderRadius: '3px' }}>
                              🔒 Override
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Seating Representation for this Zone */}
                <div style={{
                  backgroundColor: '#78350f',
                  borderRadius: '6px',
                  padding: '6px',
                  border: '1.5px solid #451a03',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px'
                }}>
                  {/* Teacher Podium in Zone A */}
                  {zConfig.id === "Zone A" && zData.teacher_present && (
                    <div style={{
                      backgroundColor: '#1e3a8a',
                      color: '#ffffff',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      border: '1px solid #60a5fa'
                    }}>
                      <GraduationCap size={12} />
                      <span>Teacher Desk</span>
                    </div>
                  )}

                  {/* Student Avatars Grid */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 }}>
                    {zData.students_count > 0 ? (
                      Array.from({ length: Math.min(8, Math.max(1, Math.ceil(zData.students_count / 3))) }).map((_, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][sIdx % 4],
                            border: '1.5px solid #ffffff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.5rem',
                            color: '#ffffff',
                            fontWeight: 800
                          }}
                          title={`Student in ${zConfig.id}`}
                        >
                          👤
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.62rem', color: '#fde68a', fontStyle: 'italic' }}>
                        Vacant Zone (0 Desks Occupied)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visualizer Status Footer Bar */}
      <div style={{
        padding: '0.85rem 1.25rem',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: 'var(--primary-navy)' }}>Dynamic Fan Allocation:</span>
          {zoneList.map((z) => {
            const zFansOn = z.fans.filter(f => fanStates[f]);
            return (
              <span
                key={z.id}
                className={`badge ${zFansOn.length > 0 ? 'badge-green' : 'badge-gray'}`}
                style={{ fontSize: '0.72rem' }}
              >
                {z.id}: {zFansOn.length > 0 ? `${zFansOn.length} Fan ON (F${zFansOn.join(',')})` : 'OFF'}
              </span>
            );
          })}
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Active Fan Load: <strong style={{ color: '#0284c7' }}>{activeFanCount} Fans × 60W = {fanPowerW} W</strong> | Total Classroom Load: <strong style={{ color: 'var(--primary-navy)' }}>{devices?.power_watts ? devices.power_watts() : ((lightsOn ? 400 : 0) + (projectorOn ? 250 : 0) + fanPowerW)} W</strong>
        </div>
      </div>
    </div>
  );
}
