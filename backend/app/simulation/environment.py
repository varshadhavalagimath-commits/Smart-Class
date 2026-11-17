import random
from typing import List, Dict, Any, Tuple, Optional
from app.models.schemas import (
    ClassroomPercepts,
    ActivityType,
    DoorWindowStatus,
    ZoneInfo,
    default_zones,
    default_fan_availability,
    default_fan_overrides,
    ZONE_FAN_MAPPING,
    FAN_ZONE_MAPPING
)


SCHEDULE_STEPS = [
    {
        "time": "08:00 AM",
        "phase": "Students enter",
        "students": 25,
        "temperature": 21.5,
        "light_intensity": 260.0,
        "activity": ActivityType.LECTURE,
        "door": DoorWindowStatus.OPEN,
        "window": DoorWindowStatus.CLOSED,
        "zones": {"Zone A": 12, "Zone B": 13, "Zone C": 0, "Zone D": 0},
        "teacher_zone": "Zone A",
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_preference": "no_preference",
        "teacher_target_fan": None
    },
    {
        "time": "09:00 AM",
        "phase": "Lecture starts",
        "students": 42,
        "temperature": 23.5,
        "light_intensity": 340.0,
        "activity": ActivityType.LECTURE,
        "door": DoorWindowStatus.CLOSED,
        "window": DoorWindowStatus.CLOSED,
        "zones": {"Zone A": 14, "Zone B": 12, "Zone C": 8, "Zone D": 8},
        "teacher_zone": "Zone A",
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_preference": "no_preference",
        "teacher_target_fan": None
    },
    {
        "time": "11:00 AM",
        "phase": "Temperature increases (Mid-day heat)",
        "students": 40,
        "temperature": 29.5,
        "light_intensity": 580.0,
        "activity": ActivityType.LECTURE,
        "door": DoorWindowStatus.CLOSED,
        "window": DoorWindowStatus.CLOSED,
        "zones": {"Zone A": 14, "Zone B": 12, "Zone C": 7, "Zone D": 7},
        "teacher_zone": "Zone A",
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_preference": "no_preference",
        "teacher_target_fan": None
    },
    {
        "time": "11:30 AM",
        "phase": "Class recess / Break",
        "students": 5,
        "temperature": 28.0,
        "light_intensity": 620.0,
        "activity": ActivityType.BREAK,
        "door": DoorWindowStatus.OPEN,
        "window": DoorWindowStatus.OPEN,
        "zones": {"Zone A": 3, "Zone B": 2, "Zone C": 0, "Zone D": 0},
        "teacher_zone": "None",
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_preference": "no_preference",
        "teacher_target_fan": None
    },
    {
        "time": "12:00 PM",
        "phase": "Students return for afternoon session",
        "students": 44,
        "temperature": 28.5,
        "light_intensity": 650.0,
        "activity": ActivityType.LECTURE,
        "door": DoorWindowStatus.CLOSED,
        "window": DoorWindowStatus.CLOSED,
        "zones": {"Zone A": 12, "Zone B": 12, "Zone C": 10, "Zone D": 10},
        "teacher_zone": "Zone A",
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_preference": "no_preference",
        "teacher_target_fan": None
    },
    {
        "time": "01:00 PM",
        "phase": "Interactive Lab session",
        "students": 36,
        "temperature": 24.8,
        "light_intensity": 420.0,
        "activity": ActivityType.LAB,
        "door": DoorWindowStatus.CLOSED,
        "window": DoorWindowStatus.CLOSED,
        "zones": {"Zone A": 10, "Zone B": 10, "Zone C": 8, "Zone D": 8},
        "teacher_zone": "Zone A",
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_preference": "no_preference",
        "teacher_target_fan": None
    },
    {
        "time": "04:00 PM",
        "phase": "Classes end - Classroom becomes vacant",
        "students": 0,
        "temperature": 23.8,
        "light_intensity": 180.0,
        "activity": ActivityType.NO_CLASS,
        "door": DoorWindowStatus.CLOSED,
        "window": DoorWindowStatus.CLOSED,
        "zones": {"Zone A": 0, "Zone B": 0, "Zone C": 0, "Zone D": 0},
        "teacher_zone": "None",
        "student_preferences": {"Zone A": "no_preference", "Zone B": "no_preference", "Zone C": "no_preference", "Zone D": "no_preference"},
        "teacher_preference": "no_preference",
        "teacher_target_fan": None
    },
]


class ClassroomEnvironment:
    """
    Simulates the physical classroom environment, environmental sensors,
    and 4-zone occupancy & 8-fan availability/overrides.
    """
    def __init__(self):
        self.schedule_index: int = 0
        self.schedule = SCHEDULE_STEPS
        self.noise_enabled: bool = False

        # Individual Fan settings (Persists across schedule ticks unless reset)
        self.fan_availability: Dict[int, bool] = default_fan_availability()
        self.fan_manual_overrides: Dict[int, Optional[bool]] = default_fan_overrides()

        # Ground truth state
        self.ground_truth = self._get_schedule_state(0)
        self.current_perceived = self.read_sensors()

    def _get_schedule_state(self, index: int) -> ClassroomPercepts:
        step = self.schedule[index % len(self.schedule)]
        zones_data = default_zones()
        sched_zones = step.get("zones", {"Zone A": 10, "Zone B": 10, "Zone C": 0, "Zone D": 0})
        sched_prefs = step.get("student_preferences", {})
        teacher_z = step.get("teacher_zone", "Zone A")

        for z_id, z_info in zones_data.items():
            z_info.students_count = sched_zones.get(z_id, 0)
            z_info.teacher_present = (teacher_z == z_id)
            z_info.student_preference = sched_prefs.get(z_id, "no_preference")
            z_info.teacher_preference = step.get("teacher_preference", "no_preference") if (teacher_z == z_id) else "no_preference"

        total_students = sum(z.students_count for z in zones_data.values())

        return ClassroomPercepts(
            students_count=total_students,
            temperature=step["temperature"],
            light_intensity=step["light_intensity"],
            activity=step["activity"],
            door_status=step["door"],
            window_status=step["window"],
            simulated_time=step["time"],
            noise_enabled=self.noise_enabled,
            zones=zones_data,
            teacher_zone=teacher_z,
            teacher_preference=step.get("teacher_preference", "no_preference"),
            teacher_target_fan=step.get("teacher_target_fan"),
            fan_availability=dict(self.fan_availability),
            fan_manual_overrides=dict(self.fan_manual_overrides)
        )

    def current_phase_description(self) -> str:
        return self.schedule[self.schedule_index % len(self.schedule)]["phase"]

    def step_schedule(self) -> Tuple[ClassroomPercepts, ClassroomPercepts]:
        self.schedule_index = (self.schedule_index + 1) % len(self.schedule)
        self.ground_truth = self._get_schedule_state(self.schedule_index)
        self.current_perceived = self.read_sensors()
        return self.current_perceived, self.ground_truth

    def set_manual_percepts(
        self,
        temperature: float,
        light_intensity: float,
        activity: ActivityType,
        door_status: DoorWindowStatus,
        window_status: DoorWindowStatus,
        students_count: Optional[int] = None,
        simulated_time: Optional[str] = None,
        zone_occupancy: Optional[Dict[str, int]] = None,
        student_preferences: Optional[Dict[str, str]] = None,
        teacher_present_zone: Optional[str] = "Zone A",
        teacher_preference: Optional[str] = "no_preference",
        teacher_target_fan: Optional[int] = None,
        fan_availability: Optional[Dict[int, bool]] = None,
        fan_manual_overrides: Optional[Dict[int, Optional[bool]]] = None
    ) -> Tuple[ClassroomPercepts, ClassroomPercepts]:
        """
        Manually sets classroom environment parameters with full zone & fan control.
        """
        current_time = simulated_time.strip() if simulated_time and str(simulated_time).strip() else self.ground_truth.simulated_time

        # Update fan availability and overrides if provided
        if fan_availability:
            for fid, avail in fan_availability.items():
                self.fan_availability[int(fid)] = bool(avail)

        if fan_manual_overrides:
            for fid, ovr in fan_manual_overrides.items():
                self.fan_manual_overrides[int(fid)] = ovr

        zones_data = default_zones()

        # Determine zone occupancy
        if zone_occupancy:
            for z_id, count in zone_occupancy.items():
                if z_id in zones_data:
                    zones_data[z_id].students_count = max(0, int(count))
            total_students = sum(z.students_count for z in zones_data.values())
        elif students_count is not None:
            # Distribute general count across zones if zone_occupancy not given
            total_students = int(students_count)
            if total_students == 0:
                for z_id in zones_data:
                    zones_data[z_id].students_count = 0
            else:
                # Distribute Front Left -> Front Right -> Back Left -> Back Right
                q = total_students // 4
                rem = total_students % 4
                for idx, z_id in enumerate(["Zone A", "Zone B", "Zone C", "Zone D"]):
                    zones_data[z_id].students_count = q + (1 if idx < rem else 0)
        else:
            total_students = self.ground_truth.students_count
            for z_id in zones_data:
                zones_data[z_id].students_count = self.ground_truth.zones.get(z_id, ZoneInfo(zone_id=z_id, name="")).students_count

        # Teacher presence & preferences
        if teacher_present_zone is not None:
            teacher_zone_str = teacher_present_zone
        elif total_students == 0:
            teacher_zone_str = "None"
        else:
            teacher_zone_str = "Zone A"

        for z_id in zones_data:
            zones_data[z_id].teacher_present = (teacher_zone_str == z_id)

            if student_preferences and z_id in student_preferences:
                zones_data[z_id].student_preference = student_preferences[z_id]
            else:
                zones_data[z_id].student_preference = self.ground_truth.zones.get(z_id, ZoneInfo(zone_id=z_id, name="")).student_preference

            if teacher_zone_str == z_id:
                zones_data[z_id].teacher_preference = teacher_preference or "no_preference"
            else:
                zones_data[z_id].teacher_preference = "no_preference"

        self.ground_truth = ClassroomPercepts(
            students_count=total_students,
            temperature=temperature,
            light_intensity=light_intensity,
            activity=activity,
            door_status=door_status,
            window_status=window_status,
            simulated_time=current_time,
            noise_enabled=self.noise_enabled,
            zones=zones_data,
            teacher_zone=teacher_zone_str,
            teacher_preference=teacher_preference or "no_preference",
            teacher_target_fan=teacher_target_fan,
            fan_availability=dict(self.fan_availability),
            fan_manual_overrides=dict(self.fan_manual_overrides)
        )
        self.current_perceived = self.read_sensors()
        return self.current_perceived, self.ground_truth

    def set_fan_override(self, fan_id: int, override: Optional[bool]) -> None:
        self.fan_manual_overrides[fan_id] = override
        self.ground_truth.fan_manual_overrides[fan_id] = override
        self.current_perceived.fan_manual_overrides[fan_id] = override

    def set_fan_availability(self, fan_id: int, is_available: bool) -> None:
        self.fan_availability[fan_id] = is_available
        self.ground_truth.fan_availability[fan_id] = is_available
        self.current_perceived.fan_availability[fan_id] = is_available

    def reset_all_fan_overrides(self) -> None:
        for fid in range(1, 9):
            self.fan_manual_overrides[fid] = None
        self.ground_truth.fan_manual_overrides = default_fan_overrides()
        self.current_perceived.fan_manual_overrides = default_fan_overrides()

    def read_sensors(self) -> ClassroomPercepts:
        if not self.noise_enabled:
            return self.ground_truth.model_copy(deep=True)

        noise_temp = round(self.ground_truth.temperature + random.uniform(-0.8, 0.8), 1)
        noise_temp = max(15.0, min(45.0, noise_temp))

        noise_light = round(self.ground_truth.light_intensity + random.uniform(-20.0, 20.0), 1)
        noise_light = max(0.0, min(1000.0, noise_light))

        cloned = self.ground_truth.model_copy(deep=True)
        cloned.temperature = noise_temp
        cloned.light_intensity = noise_light
        cloned.noise_enabled = True
        return cloned

    def reset(self) -> Tuple[ClassroomPercepts, ClassroomPercepts]:
        self.schedule_index = 0
        self.fan_availability = default_fan_availability()
        self.fan_manual_overrides = default_fan_overrides()
        self.ground_truth = self._get_schedule_state(0)
        self.current_perceived = self.read_sensors()
        return self.current_perceived, self.ground_truth
