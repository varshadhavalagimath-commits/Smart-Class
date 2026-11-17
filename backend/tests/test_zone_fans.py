import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.simulation.manager import sim_manager
from app.models.schemas import ClassroomPercepts, ActivityType, ZoneInfo, default_zones

client = TestClient(app)


def test_15_scenarios():
    print("\n=======================================================")
    print("   RUNNING 15 REQUIRED TEST SCENARIOS FOR ZONE FANS    ")
    print("=======================================================\n")

    # -------------------------------------------------------------------------
    # Scenario 1: Cold temperature with a student requesting a fan
    # -------------------------------------------------------------------------
    r1 = client.post("/api/simulation/manual", json={
        "temperature": 20.0,
        "light_intensity": 350.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 10, "Zone B": 0, "Zone C": 0, "Zone D": 0},
        "student_preferences": {"Zone A": "on", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_present_zone": "None"
    })
    assert r1.status_code == 200
    d1 = r1.json()["current_devices"]
    print("Scenario 1 (Cold 20C, Zone A student requests ON):")
    print(f"  Fans in Zone A (1,2): F1={d1['fan_states']['1']}, F2={d1['fan_states']['2']}")
    print(f"  Fans in Zone B,C,D: F3={d1['fan_states']['3']}, F5={d1['fan_states']['5']}, F7={d1['fan_states']['7']}")
    assert d1["fan_states"]["1"] is True or d1["fan_states"]["2"] is True, "Zone A fan should be ON"
    assert d1["fan_states"]["3"] is False and d1["fan_states"]["5"] is False and d1["fan_states"]["7"] is False, "Other zones should be OFF"
    print("  -> PASSED Scenario 1\n")

    # -------------------------------------------------------------------------
    # Scenario 2: Cold temperature without any fan request
    # -------------------------------------------------------------------------
    r2 = client.post("/api/simulation/manual", json={
        "temperature": 19.0,
        "light_intensity": 350.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 15, "Zone B": 10, "Zone C": 0, "Zone D": 0},
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_present_zone": "None"
    })
    d2 = r2.json()["current_devices"]
    print("Scenario 2 (Cold 19C, students present, NO fan request):")
    print(f"  Active fan count: {d2['active_fan_count']}/8")
    assert d2["active_fan_count"] == 0, "All fans should be OFF in cold room without requests"
    print("  -> PASSED Scenario 2\n")

    # -------------------------------------------------------------------------
    # Scenario 3: High temperature with only Zone A occupied
    # -------------------------------------------------------------------------
    r3 = client.post("/api/simulation/manual", json={
        "temperature": 32.0,
        "light_intensity": 350.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 15, "Zone B": 0, "Zone C": 0, "Zone D": 0},
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_present_zone": "None"
    })
    d3 = r3.json()["current_devices"]
    print("Scenario 3 (Hot 32C, ONLY Zone A occupied):")
    print(f"  Zone A Fans (F1,F2): F1={d3['fan_states']['1']}, F2={d3['fan_states']['2']}")
    print(f"  Zones B, C, D Fans: F3={d3['fan_states']['3']}, F5={d3['fan_states']['5']}, F7={d3['fan_states']['7']}")
    assert d3["fan_states"]["1"] is True or d3["fan_states"]["2"] is True, "Zone A fans should be ON"
    assert d3["fan_states"]["3"] is False and d3["fan_states"]["4"] is False, "Zone B fans must be OFF"
    assert d3["fan_states"]["5"] is False and d3["fan_states"]["6"] is False, "Zone C fans must be OFF"
    assert d3["fan_states"]["7"] is False and d3["fan_states"]["8"] is False, "Zone D fans must be OFF"
    print("  -> PASSED Scenario 3\n")

    # -------------------------------------------------------------------------
    # Scenario 4: High temperature with Zones A and B occupied (C and D empty)
    # -------------------------------------------------------------------------
    r4 = client.post("/api/simulation/manual", json={
        "temperature": 32.0,
        "light_intensity": 350.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 15, "Zone B": 10, "Zone C": 0, "Zone D": 0},
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_present_zone": "None"
    })
    d4 = r4.json()["current_devices"]
    print("Scenario 4 (Hot 32C, Zones A & B occupied, C & D empty):")
    print(f"  Zone A Fans: F1={d4['fan_states']['1']}, F2={d4['fan_states']['2']}")
    print(f"  Zone B Fans: F3={d4['fan_states']['3']}, F4={d4['fan_states']['4']}")
    print(f"  Zone C & D Fans: F5={d4['fan_states']['5']}, F6={d4['fan_states']['6']}, F7={d4['fan_states']['7']}, F8={d4['fan_states']['8']}")
    assert d4["fan_states"]["1"] is True and d4["fan_states"]["3"] is True, "Zones A and B fans should be ON"
    assert d4["fan_states"]["5"] is False and d4["fan_states"]["7"] is False, "Zones C and D fans MUST remain OFF"
    print("  -> PASSED Scenario 4\n")

    # -------------------------------------------------------------------------
    # Scenario 5: High temperature with all zones occupied
    # -------------------------------------------------------------------------
    r5 = client.post("/api/simulation/manual", json={
        "temperature": 32.0,
        "light_intensity": 350.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 14, "Zone B": 12, "Zone C": 8, "Zone D": 8},
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_present_zone": "Zone A"
    })
    d5 = r5.json()["current_devices"]
    print("Scenario 5 (Hot 32C, ALL 4 zones occupied):")
    print(f"  Active fan count: {d5['active_fan_count']}/8 (All occupied zones covered)")
    assert d5["active_fan_count"] >= 4, "Every occupied zone should have active cooling"
    print("  -> PASSED Scenario 5\n")

    # -------------------------------------------------------------------------
    # Scenario 6: Teacher requesting one particular fan (Fan 1)
    # -------------------------------------------------------------------------
    r6 = client.post("/api/simulation/manual", json={
        "temperature": 22.0,
        "light_intensity": 350.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 10, "Zone B": 0, "Zone C": 0, "Zone D": 0},
        "teacher_present_zone": "Zone A",
        "teacher_preference": "on",
        "teacher_target_fan": 1
    })
    d6 = r6.json()["current_devices"]
    print("Scenario 6 (Neutral 22C, Teacher requests Fan 1 specifically):")
    print(f"  Fan 1 state: {d6['fan_states']['1']}, Fan 2: {d6['fan_states']['2']}, Fan 3: {d6['fan_states']['3']}")
    assert d6["fan_states"]["1"] is True, "Fan 1 must be ON as specifically requested by teacher"
    assert d6["fan_states"]["3"] is False and d6["fan_states"]["5"] is False, "Empty zone fans should remain OFF"
    print("  -> PASSED Scenario 6\n")

    # -------------------------------------------------------------------------
    # Scenario 7: Manual override while automatic mode is running
    # -------------------------------------------------------------------------
    r7 = client.post("/api/simulation/fan/override", json={
        "fan_id": 5,
        "override": True
    })
    assert r7.status_code == 200
    d7 = r7.json()["current_devices"]
    print("Scenario 7 (Manual override Fan 5 to Force ON):")
    print(f"  Fan 5 state: {d7['fan_states']['5']}")
    assert d7["fan_states"]["5"] is True, "Fan 5 must be ON under manual override"
    print("  -> PASSED Scenario 7\n")

    # -------------------------------------------------------------------------
    # Scenario 8: Cancelling manual override
    # -------------------------------------------------------------------------
    r8 = client.post("/api/simulation/fan/override", json={
        "fan_id": 5,
        "override": None  # Reset to auto
    })
    assert r8.status_code == 200
    d8 = r8.json()["current_devices"]
    print("Scenario 8 (Reset Fan 5 override to Auto):")
    print(f"  Fan 5 state: {d8['fan_states']['5']}")
    print("  -> PASSED Scenario 8\n")

    # -------------------------------------------------------------------------
    # Scenario 9: Classroom becomes completely empty
    # -------------------------------------------------------------------------
    client.post("/api/simulation/fan/reset_overrides")
    r9 = client.post("/api/simulation/manual", json={
        "temperature": 34.0,
        "light_intensity": 150.0,
        "activity": "No class",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 0, "Zone B": 0, "Zone C": 0, "Zone D": 0},
        "teacher_present_zone": "None"
    })
    d9 = r9.json()["current_devices"]
    print("Scenario 9 (Classroom completely empty):")
    print(f"  Active fan count: {d9['active_fan_count']}/8, Lights: {d9['lights']}, Proj: {d9['projector']}")
    assert d9["active_fan_count"] == 0, "All fans must be OFF in empty room"
    assert d9["lights"] is False and d9["projector"] is False, "All devices must be OFF in empty room"
    print("  -> PASSED Scenario 9\n")

    # -------------------------------------------------------------------------
    # Scenario 10: One fan becoming unavailable (Fan 1 faulty -> Zone A uses Fan 2)
    # -------------------------------------------------------------------------
    # Mark Fan 1 as unavailable
    client.post("/api/simulation/fan/availability", json={"fan_id": 1, "is_available": False})
    r10 = client.post("/api/simulation/manual", json={
        "temperature": 32.0,
        "light_intensity": 350.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 10, "Zone B": 0, "Zone C": 0, "Zone D": 0},
        "teacher_present_zone": "None"
    })
    d10 = r10.json()["current_devices"]
    print("Scenario 10 (Fan 1 unavailable/faulty):")
    print(f"  Zone A Fan 1: {d10['fan_states']['1']}, Fan 2 (Alternate): {d10['fan_states']['2']}")
    assert d10["fan_states"]["1"] is False, "Unavailable Fan 1 must NEVER be activated"
    assert d10["fan_states"]["2"] is True, "Alternate available Fan 2 covering Zone A must be activated instead"
    # Restore Fan 1
    client.post("/api/simulation/fan/availability", json={"fan_id": 1, "is_available": True})
    print("  -> PASSED Scenario 10\n")

    # -------------------------------------------------------------------------
    # Scenario 11: Multiple requests in the same zone
    # -------------------------------------------------------------------------
    r11 = client.post("/api/simulation/zone/preference", json={
        "zone_id": "Zone A",
        "student_preference": "on",
        "teacher_preference": "on"
    })
    d11 = r11.json()["current_devices"]
    print("Scenario 11 (Both student and teacher request ON in Zone A):")
    print(f"  Zone A Fans: F1={d11['fan_states']['1']}, F2={d11['fan_states']['2']}")
    assert d11["fan_states"]["1"] is True or d11["fan_states"]["2"] is True
    print("  -> PASSED Scenario 11\n")

    # -------------------------------------------------------------------------
    # Scenario 12: Conflicting student and teacher preferences
    # -------------------------------------------------------------------------
    r12 = client.post("/api/simulation/manual", json={
        "temperature": 25.0,
        "light_intensity": 400.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 12, "Zone B": 0, "Zone C": 0, "Zone D": 0},
        "student_preferences": {"Zone A": "on"},
        "teacher_present_zone": "Zone A",
        "teacher_preference": "off"
    })
    d12 = r12.json()["current_devices"]
    last_dec = r12.json()["last_decision"]
    print("Scenario 12 (Conflict: Student requests ON, Teacher requests OFF in Zone A):")
    print(f"  Zone A Fans: F1={d12['fan_states']['1']}, F2={d12['fan_states']['2']}")
    print(f"  Teacher priority applied: {last_dec['zone_reasons']['Zone A']}")
    assert d12["fan_states"]["1"] is False and d12["fan_states"]["2"] is False, "Teacher preference OFF should prevail"
    print("  -> PASSED Scenario 12\n")

    # -------------------------------------------------------------------------
    # Scenario 13: Live simulation with changing occupancy
    # -------------------------------------------------------------------------
    r13_start = client.post("/api/simulation/start")
    r13_step = client.post("/api/simulation/step")
    state13 = r13_step.json()
    print("Scenario 13 (Live simulation schedule tick):")
    print(f"  Phase: {state13['schedule_phase']}, Time: {state13['simulated_time']}")
    print(f"  Zone A: {state13['current_percepts']['zones']['Zone A']['students_count']} students, Fans Active: {state13['current_devices']['active_fan_count']}")
    assert state13["is_running"] is True
    client.post("/api/simulation/pause")
    print("  -> PASSED Scenario 13\n")

    # -------------------------------------------------------------------------
    # Scenario 14: Manual input followed by immediate agent comparison
    # -------------------------------------------------------------------------
    r14_compare = client.post("/api/agents/compare")
    comp_data = r14_compare.json()["comparisons"]
    print("Scenario 14 (Immediate side-by-side comparison of all 4 agents):")
    for c in comp_data:
        print(f"  {c['agent_name']}: {c['active_fan_count']}/8 fans, Power={c['power_w']}W, Comfort={c['comfort_score']}, Coverage={c['zone_coverage']}")
    assert len(comp_data) == 4, "All 4 agents must return results"
    print("  -> PASSED Scenario 14\n")

    # -------------------------------------------------------------------------
    # Scenario 15: Energy consumption changing when active fans change
    # -------------------------------------------------------------------------
    # Set room to neutral/vacant so no automatic fans are triggered
    client.post("/api/simulation/manual", json={
        "temperature": 21.0,
        "light_intensity": 400.0,
        "activity": "Break",
        "door_status": "Closed",
        "window_status": "Closed",
        "zone_occupancy": {"Zone A": 0, "Zone B": 0, "Zone C": 0, "Zone D": 0},
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_present_zone": "None"
    })
    client.post("/api/simulation/fan/reset_overrides")

    # 2 fans ON = 120W
    client.post("/api/simulation/fan/override", json={"fan_id": 1, "override": True})
    r15_2 = client.post("/api/simulation/fan/override", json={"fan_id": 2, "override": True})
    fan_p_2 = r15_2.json()["current_devices"]["fan_power_w"]

    # 4 fans ON = 240W
    client.post("/api/simulation/fan/override", json={"fan_id": 3, "override": True})
    r15_4 = client.post("/api/simulation/fan/override", json={"fan_id": 4, "override": True})
    fan_p_4 = r15_4.json()["current_devices"]["fan_power_w"]

    # 8 fans ON = 480W
    for fid in range(1, 9):
        client.post("/api/simulation/fan/override", json={"fan_id": fid, "override": True})
    r15_8 = client.get("/api/simulation/state")
    fan_p_8 = r15_8.json()["current_devices"]["fan_power_w"]

    print("Scenario 15 (Power consumption with active fan count):")
    print(f"  2 fans ON: {fan_p_2} W (Expected: 120 W)")
    print(f"  4 fans ON: {fan_p_4} W (Expected: 240 W)")
    print(f"  8 fans ON: {fan_p_8} W (Expected: 480 W)")
    assert fan_p_2 == 120.0, f"Expected 120W, got {fan_p_2}"
    assert fan_p_4 == 240.0, f"Expected 240W, got {fan_p_4}"
    assert fan_p_8 == 480.0, f"Expected 480W, got {fan_p_8}"
    client.post("/api/simulation/fan/reset_overrides")
    print("  -> PASSED Scenario 15\n")

    print("=======================================================")
    print(">>> ALL 15 REQUIRED TEST SCENARIOS PASSED 100%! <<<")
    print("=======================================================\n")


if __name__ == "__main__":
    test_15_scenarios()
