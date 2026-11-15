import sqlite3
import os
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
        reason TEXT NOT NULL
    )
    """)
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
) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO decision_history (
        timestamp, simulated_time, students_count, temperature, light_intensity,
        activity, door_status, window_status, agent_type,
        lights, fans, projector, power_w, baseline_power_w,
        comfort_score, energy_saved_step_wh, reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        reason
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
    return [
        {
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
            "reason": row["reason"]
        }
        for row in rows
    ]


def clear_history():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM decision_history")
    conn.commit()
    conn.close()
