# Smart Classroom Energy Management Agent Using Rational Intelligent Agents

An autonomous, multi-agent AI web application designed to monitor classroom environmental conditions and automatically control classroom devices (lighting, ceiling ventilation fans, and multimedia projector) to drastically reduce unnecessary electrical energy consumption while maintaining optimal student comfort.

---

## 🌟 Key Features

### 1. Two Working Operational Modes
- **Mode A: Live Automatic Detection**
  - Continuously running classroom simulation progressing through a realistic daily schedule (08:00 AM to 04:00 PM).
  - Configurable update tick interval (1.0 to 5.0 seconds).
  - Stochastic sensor noise toggle (comparing actual environmental conditions vs perceived sensor values).
  - Real-time environmental parameter tracking: student headcount, occupancy, temperature (°C), ambient light (lux), active activity, door/window status, and simulated clock.
- **Mode B: Manual Entry Override**
  - Interactive manual control panel allowing instantaneous entry of custom conditions (Students: 0–100, Temp: 15–45°C, Light: 0–1000 lux, Activity, Door, Window, Time).
  - Immediate agent re-evaluation, decision updates, and visual actuation upon applying changes.
  - Preset test scenario buttons (High Temp 35°C, Vacant Room 0 St., Dim Room 80 Lux, Lab Session).

### 2. Four Independent Python Agent Architectures
1. **Simple Reflex Agent**:
   - Condition-Action production rules directly translating sensor thresholds to device states.
   - Shows matching fired rules and direct reflex actions.
2. **Model-Based Agent**:
   - Retains an internal world model, state history, and exponential sensor smoothing.
   - Filters temporary sensor dropouts (e.g., if occupancy temporarily reads 0 during an ongoing lecture, it awaits confirmation across consecutive readings before shutting down equipment).
   - Tracks temperature trends (Rising/Falling) and external heat ingress.
3. **Goal-Based Agent**:
   - Formulates explicit operational goals (Visual illumination $\ge 300\text{ lux}$, thermal comfort $22\text{--}26^\circ\text{C}$, idle power elimination, instructional presentation availability).
   - Evaluates actions against satisfying all active pedagogical and environmental goals.
4. **Utility-Based Rational Agent (Primary Architecture)**:
   - Evaluates all $2^3 = 8$ device candidate states (Lights $\times$ Fans $\times$ Projector).
   - Optimizes multi-objective utility formula:
     $$U = 0.45 \times \text{Comfort} + 0.40 \times \text{Energy Efficiency} + 0.15 \times \text{Operational Compliance}$$
   - Enforces mandatory constraints (unoccupied room must be 0W, active class requires adequate lux & presentation display).
   - Resolves ties in favor of lower electrical power.

### 3. Interactive 2D Classroom Visualization
- Real-time animated classroom environment:
  - Ceiling light fixtures with radial ambient glow when ON.
  - Smooth keyframe spinning ceiling fans when active.
  - Overhead multimedia projector projecting a beam and dynamic presentation slides onto the digital whiteboard when active.
  - Dynamic student desk matrix rendering avatars according to current student count.
  - Door and window states reflecting open/closed visual orientation.

### 4. Real Energy Calculations & Live Analytics
- Device power ratings:
  - **Classroom Lights:** 400 W
  - **Ceiling Fans:** 300 W
  - **Projector:** 250 W
- Energy consumption calculation:
  $$\text{Energy (kWh)} = \frac{\text{Power (W)} \times \text{Simulated Time (hours)}}{1000}$$
- Clearly defined baseline: Unmanaged traditional classroom where devices stay powered during school hours (950 W active load).
- Recharts visualizations: Power demand vs baseline area chart, cumulative energy savings bar/line chart, comfort score stability, and device runtime breakdown.

### 5. Persistent SQLite Decision Audit History
- Every decision, timestamp, sensor percept, and agent justification is recorded into `classroom_simulation.db`.
- Decision history table with search filtering by agent and keyword, CSV export, and clear log functionality.

---

