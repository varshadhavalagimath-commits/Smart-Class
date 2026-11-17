import sqlite3
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "classroom_simulation.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS decision_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        simulated_time TEXT NOT NULL,
        students_count INTEGER NOT NULL,
        temperature REAL NOT NULL,
        light_intensity REAL NOT NULL,
        activity TEXT NOT NULL,
        door_status TEXT NOT NULL,
        window_status TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        lights INTEGER NOT NULL,
        fans INTEGER NOT NULL,
        projector INTEGER NOT NULL,
        power_w REAL NOT NULL,
        baseline_power_w REAL NOT NULL,
        comfort_score REAL NOT NULL,
        energy_saved_step_wh REAL NOT NULL,
        reason TEXT NOT NULL,
        active_fan_count INTEGER DEFAULT 0,
        fan_power_w REAL DEFAULT 0.0,
        fan_states_json TEXT DEFAULT '{}',
        zone_occupancy_json TEXT DEFAULT '{}',
        zone_preferences_json TEXT DEFAULT '{}',
        mode TEXT DEFAULT 'automatic'
    )
    """)

    # Safe migration for new columns if table existed prior
    existing_cols = [row[1] for row in cursor.execute("PRAGMA table_info(decision_history)").fetchall()]
    new_cols = [
        ("active_fan_count", "INTEGER DEFAULT 0"),
        ("fan_power_w", "REAL DEFAULT 0.0"),
        ("fan_states_json", "TEXT DEFAULT '{}'"),
        ("zone_occupancy_json", "TEXT DEFAULT '{}'"),
        ("zone_preferences_json", "TEXT DEFAULT '{}'"),
        ("mode", "TEXT DEFAULT 'automatic'")
    ]
    for col_name, col_def in new_cols:
        if col_name not in existing_cols:
            try:
                cursor.execute(f"ALTER TABLE decision_history ADD COLUMN {col_name} {col_def}")
            except sqlite3.OperationalError:
                pass

    conn.commit()
    conn.close()


def insert_decision(
    simulated_time: str,
    students_count: int,
    temperature: float,
    light_intensity: float,
    activity: str,
    door_status: str,
    window_status: str,
    agent_type: str,
    lights: bool,
    fans: bool,
    projector: bool,
    power_w: float,
    baseline_power_w: float,
    comfort_score: float,
    energy_saved_step_wh: float,
    reason: str,
    active_fan_count: int = 0,
    fan_power_w: float = 0.0,
    fan_states: Optional[Dict[int, bool]] = None,
    zone_occupancy: Optional[Dict[str, int]] = None,
    zone_preferences: Optional[Dict[str, str]] = None,
    mode: str = "automatic",
) -> int:
    conn = get_connection()
    cursor = conn.cursor()

    fan_states_str = json.dumps(fan_states or {})
    zone_occupancy_str = json.dumps(zone_occupancy or {})
    zone_preferences_str = json.dumps(zone_preferences or {})

    cursor.execute("""
    INSERT INTO decision_history (
        timestamp, simulated_time, students_count, temperature, light_intensity,
        activity, door_status, window_status, agent_type,
        lights, fans, projector, power_w, baseline_power_w,
        comfort_score, energy_saved_step_wh, reason,
        active_fan_count, fan_power_w, fan_states_json,
        zone_occupancy_json, zone_preferences_json, mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        simulated_time,
        students_count,
        round(temperature, 1),
        round(light_intensity, 1),
        activity,
        door_status,
        window_status,
        agent_type,
        1 if lights else 0,
        1 if fans else 0,
        1 if projector else 0,
        round(power_w, 1),
        round(baseline_power_w, 1),
        round(comfort_score, 1),
        round(energy_saved_step_wh, 2),
        reason,
        active_fan_count,
        round(fan_power_w, 1),
        fan_states_str,
        zone_occupancy_str,
        zone_preferences_str,
        mode
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id


def get_history(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM decision_history ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for row in rows:
        # Parse JSON fields safely
        try:
            fan_states_raw = json.loads(row["fan_states_json"]) if "fan_states_json" in row.keys() and row["fan_states_json"] else {}
            fan_states = {int(k): bool(v) for k, v in fan_states_raw.items()}
        except Exception:
            fan_states = {i: bool(row["fans"]) for i in range(1, 9)}

        try:
            zone_occupancy = json.loads(row["zone_occupancy_json"]) if "zone_occupancy_json" in row.keys() and row["zone_occupancy_json"] else {}
        except Exception:
            zone_occupancy = {}

        try:
            zone_preferences = json.loads(row["zone_preferences_json"]) if "zone_preferences_json" in row.keys() and row["zone_preferences_json"] else {}
        except Exception:
            zone_preferences = {}

        active_fan_count = row["active_fan_count"] if "active_fan_count" in row.keys() and row["active_fan_count"] is not None else (1 if row["fans"] else 0)
        fan_power_w = row["fan_power_w"] if "fan_power_w" in row.keys() and row["fan_power_w"] is not None else (active_fan_count * 60.0)
        mode = row["mode"] if "mode" in row.keys() and row["mode"] else "automatic"

        result.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "simulated_time": row["simulated_time"],
            "students_count": row["students_count"],
            "temperature": row["temperature"],
            "light_intensity": row["light_intensity"],
            "activity": row["activity"],
            "door_status": row["door_status"],
            "window_status": row["window_status"],
            "agent_type": row["agent_type"],
            "lights": bool(row["lights"]),
            "fans": bool(row["fans"]),
            "projector": bool(row["projector"]),
            "power_w": row["power_w"],
            "comfort_score": row["comfort_score"],
            "energy_saved_step_wh": row["energy_saved_step_wh"],
            "reason": row["reason"],
            "active_fan_count": active_fan_count,
            "fan_power_w": fan_power_w,
            "fan_states": fan_states,
            "zone_occupancy": zone_occupancy,
            "zone_preferences": zone_preferences,
            "mode": mode
        })
    return result


def clear_history():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM decision_history")
    conn.commit()
    conn.close()
