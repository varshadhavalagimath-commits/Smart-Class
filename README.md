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

## 🛠️ Technology Stack

- **Backend:** Python 3.11+, FastAPI, Pydantic v2, Uvicorn, SQLite3.
- **Frontend:** React 18, Vite, React Router v6, Recharts, Lucide React icons.
- **Ports:**
  - Backend: `http://localhost:5000` (Swagger docs: `http://localhost:5000/docs`)
  - Frontend: `http://localhost:5173`

---

## 🚀 How to Run in VS Code

### Step 1: Open Terminal in VS Code
Open VS Code in the project root folder:
```powershell
c:\Users\varsh\OneDrive\Desktop\smart class ai
```

### Step 2: Start the Backend (Terminal 1)
Open a new terminal in VS Code (`Ctrl + ~`) and run:
```powershell
cd backend
python run.py
```
*The FastAPI backend will start on `http://localhost:5000`.*

### Step 3: Start the Frontend (Terminal 2)
Open a second terminal in VS Code (`Split Terminal` or `Ctrl + Shift + ~`) and run:
```powershell
cd frontend
npm run dev
```
*The React application will be available at `http://localhost:5173`.*

### Quick Launch (Alternative):
On Windows, you can double-click or run:
```powershell
.\start.bat
```
This automatically launches both backend and frontend servers in separate command windows.

---

## 🧪 Testing the Key Demonstration Scenarios

1. **High Temperature Test (Cooling Decision):**
   - In the **Classroom Simulator** under **Manual Entry**, set Temperature to `35°C` (or click `🔥 High Temp (35°C)`).
   - Click **APPLY CHANGES**.
   - *Result:* Ceiling fans immediately turn **ON** (300 W), the fan graphic spins, and the agent justifies cooling regulation.
2. **Vacant Classroom Test (Energy Conservation):**
   - In **Manual Entry**, set Students to `0` (or click `🚪 Vacant Room (0 St.)`).
   - Click **APPLY CHANGES**.
   - *Result:* All devices (lights, fans, projector) immediately switch **OFF** (0 W), students disappear from desks, and 100% efficiency is achieved.
3. **Dim Ambient Light Test (Artificial Lighting):**
   - Set Light Intensity to `80 lux` with active students.
   - Click **APPLY CHANGES**.
   - *Result:* Classroom lights turn **ON** (400 W), the room brightens, and visual comfort score is preserved.
4. **Agent Comparison:**
   - Navigate to **Agent Comparison** in the sidebar.
   - Click any scenario tab or enter custom conditions.
   - Observe how all four real Python agents calculate their device outputs, comfort scores, and rational utilities side by side. Click **Set as Active** to switch which agent controls the main classroom.

---

## 📦 How to Push to GitHub

To push this project to your GitHub repository, open a terminal in the project root and run:

```bash
# 1. Initialize Git repository
git init

# 2. Add all files (respecting .gitignore)
git add .

# 3. Create initial commit
git commit -m "Initial commit: Smart Classroom Energy Management Agent with 4 Rational Architectures"

# 4. Set default branch to main
git branch -M main

# 5. Link your GitHub remote repository (replace with your repo URL)
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 📁 Project Structure

```
smart-classroom-agent/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app & background simulation loop
│   │   ├── models/
│   │   │   ├── schemas.py           # Pydantic schemas (percepts, devices, metrics)
│   │   │   └── database.py          # SQLite persistence & audit log
│   │   ├── agents/
│   │   │   ├── base_agent.py        # Base agent & utility math functions
│   │   │   ├── simple_reflex.py     # Simple Reflex Agent (Condition-Action)
│   │   │   ├── model_based.py       # Model-Based Agent (State & Filter)
│   │   │   ├── goal_based.py        # Goal-Based Agent (Goal Satisfaction)
│   │   │   └── utility_based.py     # Utility-Based Agent (8-State Optimizer)
│   │   ├── simulation/
│   │   │   ├── environment.py       # Physical room & schedule simulation
│   │   │   ├── energy_engine.py     # Real kWh and baseline calculations
│   │   │   └── manager.py           # Simulation orchestrator singleton
│   │   └── routes/
│   │       ├── simulation.py        # /api/simulation endpoints
│   │       ├── agents.py            # /api/agents endpoints
│   │       └── history.py           # /api/analytics & /api/history endpoints
│   ├── tests/
│   │   └── test_api.py              # Automated test suite
│   ├── requirements.txt
│   └── run.py                       # Backend server launcher
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   ├── Navbar.jsx           # Top system header
│   │   │   ├── ClassroomVisualizer.jsx # 2D interactive animated classroom
│   │   │   ├── LiveControls.jsx     # Mode A simulation controls & slider
│   │   │   ├── ManualControlPanel.jsx # Mode B manual input controls & presets
│   │   │   └── AgentCard.jsx        # Decision justification & utility breakdown
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx    # Real-time overview dashboard
│   │   │   ├── SimulatorPage.jsx    # Main simulator interface
│   │   │   ├── AgentComparisonPage.jsx # Side-by-side agent comparison
│   │   │   ├── EnergyAnalyticsPage.jsx # Recharts consumption & savings
│   │   │   └── DecisionHistoryPage.jsx # Filterable SQLite audit log
│   │   ├── services/
│   │   │   └── api.js               # REST API client
│   │   ├── App.jsx                  # Root router & state synchronizer
│   │   ├── index.css                # Professional styles & animations
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js               # Vite config with backend proxy
├── .gitignore
├── start.bat                        # Windows 1-click startup script
├── run_backend.bat
├── run_frontend.bat
└── README.md
```

---

## 📜 License
Developed for academic and educational demonstrations of Rational Intelligent Agents in AI & IoT Systems.
