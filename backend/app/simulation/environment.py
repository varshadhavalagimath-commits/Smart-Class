import random
from typing import List, Dict, Any, Tuple
from app.models.schemas import ClassroomPercepts, ActivityType, DoorWindowStatus


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
    },
]


class ClassroomEnvironment:
    """
    Simulates the physical classroom environment and environmental sensors.
    Supports scheduled progression and manual overrides.
    """
    def __init__(self):
        self.schedule_index: int = 0
        self.schedule = SCHEDULE_STEPS
        self.noise_enabled: bool = False
        # Ground truth state
        self.ground_truth = self._get_schedule_state(0)

    def _get_schedule_state(self, index: int) -> ClassroomPercepts:
        step = self.schedule[index % len(self.schedule)]
        return ClassroomPercepts(
            students_count=step["students"],
            temperature=step["temperature"],
            light_intensity=step["light_intensity"],
            activity=step["activity"],
            door_status=step["door"],
            window_status=step["window"],
            simulated_time=step["time"],
            noise_enabled=self.noise_enabled
        )

    def current_phase_description(self) -> str:
        return self.schedule[self.schedule_index % len(self.schedule)]["phase"]

    def step_schedule(self) -> Tuple[ClassroomPercepts, ClassroomPercepts]:
        """
        Advances to the next schedule step.
        Returns: (perceived_state, raw_ground_truth)
        """
        self.schedule_index = (self.schedule_index + 1) % len(self.schedule)
        self.ground_truth = self._get_schedule_state(self.schedule_index)
        perceived = self.read_sensors()
        return perceived, self.ground_truth

    def set_manual_percepts(
        self,
        students_count: int,
        temperature: float,
        light_intensity: float,
        activity: ActivityType,
        door_status: DoorWindowStatus,
        window_status: DoorWindowStatus,
        simulated_time: str = None
    ) -> Tuple[ClassroomPercepts, ClassroomPercepts]:
        """
        Manually sets the classroom environment.
        """
        current_time = simulated_time if simulated_time else self.ground_truth.simulated_time
        self.ground_truth = ClassroomPercepts(
            students_count=students_count,
            temperature=temperature,
            light_intensity=light_intensity,
            activity=activity,
            door_status=door_status,
            window_status=window_status,
            simulated_time=current_time,
            noise_enabled=self.noise_enabled
        )
        perceived = self.read_sensors()
        return perceived, self.ground_truth

    def read_sensors(self) -> ClassroomPercepts:
        """
        Generates sensor readings from ground truth, optionally injecting realistic sensor noise.
        """
        if not self.noise_enabled:
            return self.ground_truth.model_copy()

        # Add slight realistic stochastic sensor noise
        noise_temp = round(self.ground_truth.temperature + random.uniform(-1.2, 1.2), 1)
        noise_temp = max(15.0, min(45.0, noise_temp))

        noise_light = round(self.ground_truth.light_intensity + random.uniform(-35.0, 35.0), 1)
        noise_light = max(0.0, min(1000.0, noise_light))

        noise_students = self.ground_truth.students_count
        # Occasional 5% transient sensor dropout when occupied
        if noise_students > 0 and random.random() < 0.05:
            noise_students = 0

        return ClassroomPercepts(
            students_count=noise_students,
            temperature=noise_temp,
            light_intensity=noise_light,
            activity=self.ground_truth.activity,
            door_status=self.ground_truth.door_status,
            window_status=self.ground_truth.window_status,
            simulated_time=self.ground_truth.simulated_time,
            noise_enabled=True
        )

    def reset(self) -> Tuple[ClassroomPercepts, ClassroomPercepts]:
        self.schedule_index = 0
        self.ground_truth = self._get_schedule_state(0)
        return self.read_sensors(), self.ground_truth
