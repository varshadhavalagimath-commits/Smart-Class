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
  Layers
} from 'lucide-react';

export default function ClassroomVisualizer({ percepts, devices, activeAgent, lastDecision }) {
  const isOccupied = percepts?.students_count > 0;
  const lightsOn = devices?.lights ?? false;
  const fansOn = devices?.fans ?? false;
  const projectorOn = devices?.projector ?? false;
  const temp = percepts?.temperature ?? 24;
  const lux = percepts?.light_intensity ?? 400;
  const studentsCount = percepts?.students_count ?? 0;
  const isDoorOpen = percepts?.door_status === 'Open';
  const isWindowOpen = percepts?.window_status === 'Open';
  const activity = percepts?.activity || 'No class';

  // Compute visual ambient light intensity
  // Effective lux increases when classroom lights are ON
  const effectiveLux = lux + (lightsOn ? 320 : 0);
  const brightnessFilter = Math.min(1.15, Math.max(0.65, effectiveLux / 500));

  // Determine number of student avatars to render (scaled up to 16 seats visual representation)
  const totalDesks = 12;
  const occupiedSeats = studentsCount === 0 ? 0 : Math.min(totalDesks, Math.max(1, Math.ceil((studentsCount / 50) * totalDesks)));

  // Color temp styling
  const isHot = temp > 26;
  const isCold = temp < 22;
  const tempColor = isHot ? '#ef4444' : isCold ? '#3b82f6' : '#10b981';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            <Layers size={15} color="#38bdf8" />
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
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px'
          }}>
            <Users size={14} color="#60a5fa" />
            <span>{studentsCount} Students ({isOccupied ? 'Occupied' : 'Vacant'})</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: tempColor,
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px',
            fontWeight: 600
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
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px'
          }}>
            <Sun size={14} color="#facc15" />
            <span>{lux.toFixed(0)} Lux (Eff: {effectiveLux.toFixed(0)})</span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            color: '#cbd5e1',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '0.25rem 0.6rem',
            borderRadius: '6px'
          }}>
            {isDoorOpen ? <DoorOpen size={14} color="#f59e0b" /> : <DoorClosed size={14} color="#94a3b8" />}
            <span>Door: {isDoorOpen ? 'Open' : 'Closed'}</span>
          </div>
        </div>
      </div>

      {/* Interactive 2D Classroom Stage */}
      <div style={{
        position: 'relative',
        height: '460px',
        backgroundColor: '#cbd5e1',
        overflow: 'hidden',
        filter: `brightness(${brightnessFilter})`,
        transition: 'filter 0.5s ease',
        backgroundImage: 'linear-gradient(to bottom, #94a3b8 0%, #cbd5e1 45%, #64748b 45%, #475569 100%)'
      }}>
        {/* Ambient Light Glow Overlay when Lights are ON */}
        {lightsOn && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 20%, rgba(254, 240, 138, 0.35) 0%, rgba(253, 224, 71, 0.12) 50%, transparent 80%)',
            pointerEvents: 'none',
            zIndex: 15,
            transition: 'opacity 0.4s ease'
          }} />
        )}

        {/* BACK WALL ELEMENTS */}
        {/* Smart Board / Projector Screen */}
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '170px',
          backgroundColor: projectorOn ? '#0f172a' : '#f8fafc',
          border: '8px solid #334155',
          borderRadius: '8px',
          boxShadow: projectorOn 
            ? '0 0 35px rgba(59, 130, 246, 0.45), 0 10px 25px rgba(0,0,0,0.3)' 
            : '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: projectorOn ? '#38bdf8' : '#64748b',
          transition: 'all 0.4s ease',
          zIndex: 5
        }}>
          {projectorOn ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: 'rgba(37, 99, 235, 0.3)',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                marginBottom: '0.5rem',
                fontSize: '0.75rem',
                color: '#93c5fd'
              }}>
                <Sparkles size={12} />
                <span>ACTIVE PRESENTATION</span>
              </div>
              <h4 style={{ color: '#ffffff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                {activity === 'Lab' ? 'Lab Exercise: Sensor Automation' : 'Lecture: Rational Intelligent Agents'}
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.35rem' }}>
                Formula: U = 0.45·Comfort + 0.40·Energy + 0.15·Compliance
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Video size={32} color="#94a3b8" style={{ marginBottom: '0.4rem', opacity: 0.6 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Whiteboard (Projector Standby)</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Powered OFF to eliminate standby power</div>
            </div>
          )}
        </div>

        {/* Projector Hanging from Ceiling with Beam */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20
        }}>
          <div style={{ width: '4px', height: '14px', backgroundColor: '#475569' }} />
          <div style={{
            padding: '0.35rem 0.75rem',
            backgroundColor: '#1e293b',
            borderRadius: '6px',
            border: projectorOn ? '2px solid #38bdf8' : '1px solid #475569',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: projectorOn ? '#38bdf8' : '#94a3b8',
            fontSize: '0.7rem',
            fontWeight: 700,
            boxShadow: projectorOn ? '0 0 15px rgba(56, 189, 248, 0.5)' : 'none'
          }}>
            <Video size={13} color={projectorOn ? '#38bdf8' : '#94a3b8'} />
            <span>PROJECTOR: {projectorOn ? 'ON (250W)' : 'OFF (0W)'}</span>
          </div>

          {/* Light projection cone beam */}
          {projectorOn && (
            <div style={{
              width: '0',
              height: '0',
              borderLeft: '40px solid transparent',
              borderRight: '40px solid transparent',
              borderTop: '50px solid rgba(56, 189, 248, 0.22)',
              filter: 'blur(2px)',
              pointerEvents: 'none'
            }} />
          )}
        </div>

        {/* CEILING LIGHT FIXTURES (Left & Right) */}
        {/* Left Light */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '18%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20
        }}>
          <div style={{ width: '3px', height: '10px', backgroundColor: '#64748b' }} />
          <div style={{
            width: '90px',
            height: '22px',
            borderRadius: '11px',
            backgroundColor: lightsOn ? '#fef08a' : '#e2e8f0',
            border: lightsOn ? '2px solid #eab308' : '1px solid #94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            boxShadow: lightsOn ? '0 0 25px rgba(250, 204, 21, 0.9), 0 0 45px rgba(250, 204, 21, 0.4)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <Lightbulb size={12} color={lightsOn ? '#ca8a04' : '#64748b'} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: lightsOn ? '#854d0e' : '#64748b' }}>
              {lightsOn ? 'ON (400W)' : 'OFF'}
            </span>
          </div>
        </div>

        {/* Right Light */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '18%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20
        }}>
          <div style={{ width: '3px', height: '10px', backgroundColor: '#64748b' }} />
          <div style={{
            width: '90px',
            height: '22px',
            borderRadius: '11px',
            backgroundColor: lightsOn ? '#fef08a' : '#e2e8f0',
            border: lightsOn ? '2px solid #eab308' : '1px solid #94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem',
            boxShadow: lightsOn ? '0 0 25px rgba(250, 204, 21, 0.9), 0 0 45px rgba(250, 204, 21, 0.4)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <Lightbulb size={12} color={lightsOn ? '#ca8a04' : '#64748b'} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: lightsOn ? '#854d0e' : '#64748b' }}>
              {lightsOn ? 'ON (400W)' : 'OFF'}
            </span>
          </div>
        </div>

        {/* CEILING FANS (Left & Right) */}
        {/* Left Fan */}
        <div style={{
          position: 'absolute',
          top: '48px',
          left: '12%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 22
        }}>
          <div style={{ width: '4px', height: '12px', backgroundColor: '#475569' }} />
          <div style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div className={fansOn ? 'fan-spinning' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wind size={38} color={fansOn ? '#0284c7' : '#64748b'} />
            </div>
          </div>
          <div style={{
            marginTop: '-4px',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            backgroundColor: fansOn ? '#e0f2fe' : '#f1f5f9',
            color: fansOn ? '#0369a1' : '#64748b',
            border: fansOn ? '1px solid #7dd3fc' : '1px solid #cbd5e1'
          }}>
            FAN: {fansOn ? 'SPINNING (300W)' : 'OFF'}
          </div>
        </div>

        {/* Right Fan */}
        <div style={{
          position: 'absolute',
          top: '48px',
          right: '12%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 22
        }}>
          <div style={{ width: '4px', height: '12px', backgroundColor: '#475569' }} />
          <div style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div className={fansOn ? 'fan-spinning' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wind size={38} color={fansOn ? '#0284c7' : '#64748b'} />
            </div>
          </div>
          <div style={{
            marginTop: '-4px',
            fontSize: '0.65rem',
            fontWeight: 700,
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            backgroundColor: fansOn ? '#e0f2fe' : '#f1f5f9',
            color: fansOn ? '#0369a1' : '#64748b',
            border: fansOn ? '1px solid #7dd3fc' : '1px solid #cbd5e1'
          }}>
            FAN: {fansOn ? 'SPINNING (300W)' : 'OFF'}
          </div>
        </div>

        {/* LEFT WALL: WINDOW WITH DAYLIGHT */}
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '12px',
          width: '75px',
          height: '115px',
          backgroundColor: lux > 500 ? '#bae6fd' : lux > 250 ? '#93c5fd' : '#475569',
          border: '4px solid #1e293b',
          borderRadius: '4px',
          boxShadow: 'inset 0 0 15px rgba(255,255,255,0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '4px',
          zIndex: 6
        }}>
          <div style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            color: lux > 300 ? '#0369a1' : '#cbd5e1',
            textAlign: 'center'
          }}>
            {isWindowOpen ? 'Window Open' : 'Window Closed'}
          </div>
          <div style={{ height: '2px', backgroundColor: '#1e293b', margin: 'auto 0' }} />
          <div style={{
            fontSize: '0.58rem',
            textAlign: 'center',
            color: lux > 300 ? '#0369a1' : '#cbd5e1',
            fontWeight: 600
          }}>
            {lux.toFixed(0)} Lux Ext.
          </div>
        </div>

        {/* RIGHT WALL: CLASSROOM DOOR */}
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '15px',
          width: '65px',
          height: '135px',
          backgroundColor: isDoorOpen ? '#334155' : '#78350f',
          border: '4px solid #1e293b',
          borderRadius: '4px 4px 0 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 4px',
          zIndex: 6
        }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#fef3c7' }}>
            {isDoorOpen ? 'DOOR OPEN' : 'DOOR CLOSED'}
          </span>
          {!isDoorOpen && (
            <div style={{ width: '8px', height: '8px', backgroundColor: '#fbbf24', borderRadius: '50%', alignSelf: 'flex-start', marginLeft: '6px' }} />
          )}
          <span style={{ fontSize: '0.55rem', color: '#cbd5e1' }}>Class 301</span>
        </div>

        {/* TEACHER PODIUM / DESK */}
        <div style={{
          position: 'absolute',
          top: '215px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '140px',
          height: '42px',
          backgroundColor: '#451a03',
          border: '2px solid #292524',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.25)',
          zIndex: 10
        }}>
          <div style={{
            width: '36px',
            height: '24px',
            backgroundColor: '#0f172a',
            border: '2px solid #38bdf8',
            borderRadius: '3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.55rem',
            color: '#38bdf8',
            fontWeight: 700
          }}>
            AI AGY
          </div>
          <span style={{ marginLeft: '8px', color: '#fef3c7', fontSize: '0.68rem', fontWeight: 600 }}>
            Teacher Desk
          </span>
        </div>

        {/* STUDENT SEATING MATRIX (DESKS & STUDENT AVATARS) */}
        <div style={{
          position: 'absolute',
          bottom: '15px',
          left: '5%',
          right: '5%',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '12px 16px',
          zIndex: 12
        }}>
          {Array.from({ length: totalDesks }).map((_, idx) => {
            const hasStudent = idx < occupiedSeats;
            return (
              <div
                key={idx}
                style={{
                  height: '74px',
                  backgroundColor: '#78350f',
                  border: '2px solid #451a03',
                  borderRadius: '6px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px',
                  position: 'relative'
                }}
              >
                {/* Desk label */}
                <div style={{ fontSize: '0.55rem', color: '#fde68a', fontWeight: 600 }}>
                  Seat {idx + 1}
                </div>

                {/* Student Avatar when present */}
                {hasStudent ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    animation: 'fadeIn 0.3s ease'
                  }}>
                    {/* Head */}
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][idx % 5],
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                    {/* Torso */}
                    <div style={{
                      width: '26px',
                      height: '14px',
                      borderRadius: '4px 4px 0 0',
                      backgroundColor: '#1e3a8a',
                      marginTop: '1px'
                    }} />
                  </div>
                ) : (
                  <div style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.62rem',
                    fontStyle: 'italic',
                    margin: 'auto 0'
                  }}>
                    Vacant
                  </div>
                )}

                {/* Notebook / Laptop on desk */}
                <div style={{
                  width: '32px',
                  height: '6px',
                  backgroundColor: hasStudent ? '#f8fafc' : 'rgba(255,255,255,0.2)',
                  borderRadius: '2px',
                  border: '1px solid #451a03'
                }} />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>Active Device Decision:</span>
          <span className={`badge ${lightsOn ? 'badge-green' : 'badge-gray'}`}>
            Lights: {lightsOn ? 'ON (400W)' : 'OFF'}
          </span>
          <span className={`badge ${fansOn ? 'badge-green' : 'badge-gray'}`}>
            Fans: {fansOn ? 'ON (300W)' : 'OFF'}
          </span>
          <span className={`badge ${projectorOn ? 'badge-green' : 'badge-gray'}`}>
            Projector: {projectorOn ? 'ON (250W)' : 'OFF'}
          </span>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Total Power: <strong style={{ color: 'var(--primary-navy)' }}>{devices?.power_watts ? devices.power_watts() : ((lightsOn ? 400 : 0) + (fansOn ? 300 : 0) + (projectorOn ? 250 : 0))} W</strong>
        </div>
      </div>
    </div>
  );
}
