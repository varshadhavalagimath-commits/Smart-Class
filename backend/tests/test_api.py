import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api():
    # 1. Test root
    r0 = client.get("/")
    assert r0.status_code == 200, f"Root failed: {r0.status_code}"

    # 2. Test simulation state
    r1 = client.get("/api/simulation/state")
    assert r1.status_code == 200, f"State failed: {r1.status_code}"
    data1 = r1.json()
    print("Initial State Time:", data1["simulated_time"], "Students:", data1["current_percepts"]["students_count"])

    # 3. Test step
    r2 = client.post("/api/simulation/step")
    assert r2.status_code == 200, f"Step failed: {r2.status_code}"
    data2 = r2.json()
    print("After Step Time:", data2["simulated_time"], "Phase:", data2["schedule_phase"])

    # 4. Test manual override (33.5C hot room)
    r3 = client.post("/api/simulation/manual", json={
        "students_count": 38,
        "temperature": 33.5,
        "light_intensity": 450.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "simulated_time": "11:15 AM"
    })
    assert r3.status_code == 200, f"Manual failed: {r3.status_code}"
    data3 = r3.json()
    print("Manual State Devices:", data3["current_devices"], "Temp:", data3["current_percepts"]["temperature"])
    assert data3["current_devices"]["fans"] is True, "Fans should be ON for 33.5C"

    # 5. Test manual vacant room
    r4 = client.post("/api/simulation/manual", json={
        "students_count": 0,
        "temperature": 24.0,
        "light_intensity": 200.0,
        "activity": "No class",
        "door_status": "Closed",
        "window_status": "Closed",
        "simulated_time": "05:00 PM"
    })
    assert r4.status_code == 200, f"Manual vacant failed: {r4.status_code}"
    data4 = r4.json()
    print("Vacant Room Devices:", data4["current_devices"])
    assert data4["current_devices"]["lights"] is False, "Lights should be OFF when vacant"
    assert data4["current_devices"]["fans"] is False, "Fans should be OFF when vacant"
    assert data4["current_devices"]["projector"] is False, "Projector should be OFF when vacant"

    # 6. Test compare all agents
    r5 = client.post("/api/agents/compare", json={
        "students_count": 40,
        "temperature": 31.0,
        "light_intensity": 120.0,
        "activity": "Lecture",
        "door_status": "Closed",
        "window_status": "Closed",
        "simulated_time": "10:00 AM",
        "noise_enabled": False
    })
    assert r5.status_code == 200, f"Compare failed: {r5.status_code}"
    compare_data = r5.json()
    print("Compare count:", len(compare_data["comparisons"]))
    for c in compare_data["comparisons"]:
        print(f"  {c['agent_name']}: L={c['lights']}, F={c['fans']}, P={c['projector']}, U={c['utility_score']}")

    # 7. Test analytics
    r6 = client.get("/api/analytics")
    assert r6.status_code == 200, f"Analytics failed: {r6.status_code}"
    print("Analytics points:", len(r6.json()["history_points"]))

    # 8. Test history
    r7 = client.get("/api/history")
    assert r7.status_code == 200, f"History failed: {r7.status_code}"
    print("History count:", len(r7.json()))

    # 9. Test config update
    r8 = client.post("/api/simulation/config", json={
        "update_interval_sec": 3.0,
        "noise_enabled": True
    })
    assert r8.status_code == 200
    assert r8.json()["config"]["update_interval_sec"] == 3.0
    assert r8.json()["config"]["noise_enabled"] is True

    print("\n>>> ALL 9 BACKEND API TESTS PASSED SUCCESSFULLY! <<<")


if __name__ == "__main__":
    test_api()
