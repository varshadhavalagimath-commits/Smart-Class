from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum


class ActivityType(str, Enum):
    LECTURE = "Lecture"
    LAB = "Lab"
    BREAK = "Break"
    NO_CLASS = "No class"


class DoorWindowStatus(str, Enum):
    OPEN = "Open"
    CLOSED = "Closed"


class AgentType(str, Enum):
    SIMPLE_REFLEX = "simple_reflex"
    MODEL_BASED = "model_based"
    GOAL_BASED = "goal_based"
    UTILITY_BASED = "utility_based"


class FanPreference(str, Enum):
    NO_PREFERENCE = "no_preference"
    ON = "on"
    OFF = "off"


# Static Zone Configuration: 8 Fans across 4 Zones
ZONE_FAN_MAPPING = {
    "Zone A": [1, 2],  # Front Left
    "Zone B": [3, 4],  # Front Right
    "Zone C": [5, 6],  # Back Left
    "Zone D": [7, 8],  # Back Right
}

FAN_ZONE_MAPPING = {
    1: "Zone A", 2: "Zone A",
    3: "Zone B", 4: "Zone B",
    5: "Zone C", 6: "Zone C",
    7: "Zone D", 8: "Zone D"
}

FAN_POWER_PER_UNIT_W = 60.0
LIGHTS_POWER_W = 400.0
PROJECTOR_POWER_W = 250.0
TOTAL_FAN_COUNT = 8
MAX_FAN_POWER_W = TOTAL_FAN_COUNT * FAN_POWER_PER_UNIT_W  # 480 W
MAX_TOTAL_POWER_W = LIGHTS_POWER_W + PROJECTOR_POWER_W + MAX_FAN_POWER_W  # 1130 W


class FanInfo(BaseModel):
    fan_id: int = Field(..., ge=1, le=8)
    name: str
    zone: str
    is_on: bool = False
    is_available: bool = True
    manual_override: Optional[bool] = None  # None = auto, True = force ON, False = force OFF
    power_w: float = FAN_POWER_PER_UNIT_W


class ZoneInfo(BaseModel):
    zone_id: str  # "Zone A", "Zone B", "Zone C", "Zone D"
    name: str     # "Front Left", "Front Right", "Back Left", "Back Right"
    students_count: int = 0
    teacher_present: bool = False
    student_preference: str = "no_preference"  # "no_preference", "on", "off"
    teacher_preference: str = "no_preference"  # "no_preference", "on", "off"
    fans: List[int] = Field(default_factory=list)
    active_fans: List[int] = Field(default_factory=list)

    @property
    def is_occupied(self) -> bool:
        return self.students_count > 0 or self.teacher_present


def default_zones() -> Dict[str, ZoneInfo]:
    return {
        "Zone A": ZoneInfo(zone_id="Zone A", name="Front Left", students_count=0, teacher_present=False, fans=[1, 2]),
        "Zone B": ZoneInfo(zone_id="Zone B", name="Front Right", students_count=0, teacher_present=False, fans=[3, 4]),
        "Zone C": ZoneInfo(zone_id="Zone C", name="Back Left", students_count=0, teacher_present=False, fans=[5, 6]),
        "Zone D": ZoneInfo(zone_id="Zone D", name="Back Right", students_count=0, teacher_present=False, fans=[7, 8]),
    }


def default_fan_states() -> Dict[int, bool]:
    return {i: False for i in range(1, 9)}


def default_fan_availability() -> Dict[int, bool]:
    return {i: True for i in range(1, 9)}


def default_fan_overrides() -> Dict[int, Optional[bool]]:
    return {i: None for i in range(1, 9)}


class DeviceState(BaseModel):
    lights: bool = False
    fans: bool = False  # Backward-compatible summary: True if any fan is active
    projector: bool = False
    fan_states: Dict[int, bool] = Field(default_factory=default_fan_states)
    fan_availability: Dict[int, bool] = Field(default_factory=default_fan_availability)
    fan_overrides: Dict[int, Optional[bool]] = Field(default_factory=default_fan_overrides)
    active_fan_count: int = 0
    fan_power_w: float = 0.0

    def model_post_init(self, __context: Any) -> None:
        self.active_fan_count = sum(1 for state in self.fan_states.values() if state)
        self.fans = self.active_fan_count > 0
        self.fan_power_w = round(self.active_fan_count * FAN_POWER_PER_UNIT_W, 1)

    def power_watts(
        self,
        lights_w: float = LIGHTS_POWER_W,
        fans_unit_w: float = FAN_POWER_PER_UNIT_W,
        projector_w: float = PROJECTOR_POWER_W
    ) -> float:
        total = 0.0
        if self.lights:
            total += lights_w
        if self.projector:
            total += projector_w
        total += self.active_fan_count * fans_unit_w
        return total


class ClassroomPercepts(BaseModel):
    students_count: int = Field(default=0, ge=0, le=100)
    is_occupied: bool = False
    temperature: float = Field(default=24.0, ge=15.0, le=45.0)
    light_intensity: float = Field(default=400.0, ge=0.0, le=1000.0)
    activity: ActivityType = ActivityType.NO_CLASS
    door_status: DoorWindowStatus = DoorWindowStatus.CLOSED
    window_status: DoorWindowStatus = DoorWindowStatus.CLOSED
    simulated_time: str = "08:00 AM"
    noise_enabled: bool = False

    # Dynamic Zone-Based Fan Control Percepts
    zones: Dict[str, ZoneInfo] = Field(default_factory=default_zones)
    teacher_zone: Optional[str] = "Zone A"
    teacher_preference: str = "no_preference"  # "no_preference", "on", "off"
    teacher_target_fan: Optional[int] = None   # e.g. 1
    fan_availability: Dict[int, bool] = Field(default_factory=default_fan_availability)
    fan_manual_overrides: Dict[int, Optional[bool]] = Field(default_factory=default_fan_overrides)

    def model_post_init(self, __context: Any) -> None:
        total_students_in_zones = sum(z.students_count for z in self.zones.values())
        if total_students_in_zones > 0:
            self.students_count = total_students_in_zones
        has_teacher = any(z.teacher_present for z in self.zones.values()) or (self.teacher_zone is not None and self.teacher_zone != "None")
        self.is_occupied = self.students_count > 0 or has_teacher


class ManualInputRequest(BaseModel):
    students_count: Optional[int] = Field(default=None, ge=0, le=100)
    temperature: float = Field(..., ge=15.0, le=45.0, description="Temperature in °C (15-45)")
    light_intensity: float = Field(..., ge=0.0, le=1000.0, description="Ambient light intensity in lux (0-1000)")
    activity: ActivityType = ActivityType.LECTURE
    door_status: DoorWindowStatus = DoorWindowStatus.CLOSED
    window_status: DoorWindowStatus = DoorWindowStatus.CLOSED
    simulated_time: Optional[str] = None

    # Zone-based inputs
    zone_occupancy: Optional[Dict[str, int]] = None  # {"Zone A": 10, "Zone B": 15, "Zone C": 0, "Zone D": 0}
    student_preferences: Optional[Dict[str, str]] = None  # {"Zone A": "on", "Zone B": "no_preference", ...}
    teacher_present_zone: Optional[str] = None  # "Zone A", "Zone B", "Zone C", "Zone D", "None"
    teacher_preference: Optional[str] = "no_preference"  # "no_preference", "on", "off"
    teacher_target_fan: Optional[int] = None
    fan_availability: Optional[Dict[int, bool]] = None
    fan_manual_overrides: Optional[Dict[int, Optional[bool]]] = None


class FanOverrideRequest(BaseModel):
    fan_id: int = Field(..., ge=1, le=8)
    override: Optional[bool] = None  # True=Force ON, False=Force OFF, None=Reset to Auto


class FanAvailabilityRequest(BaseModel):
    fan_id: int = Field(..., ge=1, le=8)
    is_available: bool = True


class ZonePreferenceRequest(BaseModel):
    zone_id: str
    student_preference: Optional[str] = None
    teacher_preference: Optional[str] = None
    teacher_target_fan: Optional[int] = None


class GoalStatus(BaseModel):
    goal_name: str
    target: str
    achieved: bool
    description: str


class UtilityCombinationEvaluation(BaseModel):
    lights: bool
    fans: bool
    projector: bool
    power_w: float
    comfort_score: float
    energy_score: float
    compliance_score: float
    utility_score: float
    is_chosen: bool = False


class AgentDecision(BaseModel):
    agent_type: AgentType
    agent_name: str
    previous_state: DeviceState
    selected_state: DeviceState
    power_w: float
    comfort_score: float
    energy_efficiency_score: float
    operational_compliance_score: float
    utility_score: float
    reason: str
    matched_rule: Optional[str] = None
    internal_state: Optional[Dict[str, Any]] = None
    goals_status: Optional[List[GoalStatus]] = None
    utility_breakdown: Optional[List[UtilityCombinationEvaluation]] = None

    # Zone-based dynamic fan decision output
    fan_states: Dict[int, bool] = Field(default_factory=default_fan_states)
    active_fan_count: int = 0
    fan_power_w: float = 0.0
    zone_fan_allocations: Optional[Dict[str, List[int]]] = None
    zone_reasons: Optional[Dict[str, str]] = None


class AgentComparisonItem(BaseModel):
    agent_type: AgentType
    agent_name: str
    lights: bool
    fans: bool
    projector: bool
    comfort_score: float
    power_w: float
    utility_score: float
    reason: str
    matched_detail: Optional[str] = None

    # Dynamic zone-based fan comparison fields
    fan_states: Dict[int, bool] = Field(default_factory=default_fan_states)
    active_fan_count: int = 0
    fan_power_w: float = 0.0
    zone_coverage: Dict[str, str] = Field(default_factory=dict)
    memory_info: Optional[Dict[str, Any]] = None
    goal_status_list: Optional[List[str]] = None


class AgentCompareResponse(BaseModel):
    percepts: ClassroomPercepts
    comparisons: List[AgentComparisonItem]


class SimulationConfig(BaseModel):
    update_interval_sec: float = 2.0
    mode: str = "automatic"  # "automatic" or "manual"
    active_agent: AgentType = AgentType.UTILITY_BASED
    noise_enabled: bool = False
    light_threshold_lux: float = 300.0
    temp_comfort_min: float = 22.0
    temp_comfort_max: float = 26.0
    fan_activation_temp: float = 28.0  # Normal automatic fan activation threshold
    fan_power_w_per_unit: float = FAN_POWER_PER_UNIT_W
    sim_minutes_per_step: int = 15
    cost_per_kwh: float = 0.15  # Electricity cost rate ($/kWh)


class SimulationMetrics(BaseModel):
    total_energy_kwh: float = 0.0
    baseline_energy_kwh: float = 0.0
    energy_saved_kwh: float = 0.0
    savings_percentage: float = 0.0
    current_power_w: float = 0.0
    baseline_power_w: float = MAX_TOTAL_POWER_W
    average_comfort: float = 100.0
    total_steps: int = 0
    active_fan_count: int = 0
    fan_power_w: float = 0.0
    estimated_cost_saved: float = 0.0
    device_runtime_minutes: Dict[str, int] = Field(
        default_factory=lambda: {"lights": 0, "fans": 0, "projector": 0}
    )


class SimulationState(BaseModel):
    is_running: bool = False
    step_count: int = 0
    simulated_time: str = "08:00 AM"
    schedule_phase: str = "Students enter"
    current_percepts: ClassroomPercepts
    raw_percepts: ClassroomPercepts
    active_agent: AgentType
    current_devices: DeviceState
    last_decision: Optional[AgentDecision] = None
    metrics: SimulationMetrics
    config: SimulationConfig


class HistoryItem(BaseModel):
    id: int
    timestamp: str
    simulated_time: str
    students_count: int
    temperature: float
    light_intensity: float
    activity: str
    door_status: str
    window_status: str
    agent_type: str
    lights: bool
    fans: bool
    projector: bool
    power_w: float
    comfort_score: float
    energy_saved_step_wh: float
    reason: str
    active_fan_count: int = 0
    fan_power_w: float = 0.0
    fan_states: Dict[int, bool] = Field(default_factory=default_fan_states)
    zone_occupancy: Optional[Dict[str, int]] = None
    zone_preferences: Optional[Dict[str, str]] = None
    mode: str = "automatic"


class AnalyticsDataPoint(BaseModel):
    step: int
    simulated_time: str
    agent_power_w: float
    baseline_power_w: float
    comfort_score: float
    cumulative_energy_kwh: float
    cumulative_savings_kwh: float
    temperature: float
    lux: float
    students: int
    active_fan_count: int = 0
    fan_power_w: float = 0.0


class AnalyticsResponse(BaseModel):
    total_energy_kwh: float
    baseline_energy_kwh: float
    energy_saved_kwh: float
    savings_percentage: float
    current_power_w: float
    baseline_power_w: float
    average_comfort: float
    active_fan_count: int = 0
    fan_power_w: float = 0.0
    estimated_cost_spent: float = 0.0
    estimated_cost_saved: float = 0.0
    device_runtime_minutes: Dict[str, int]
    history_points: List[AnalyticsDataPoint]
