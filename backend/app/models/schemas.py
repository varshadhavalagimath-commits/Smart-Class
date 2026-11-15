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


class DeviceState(BaseModel):
    lights: bool = False
    fans: bool = False
    projector: bool = False

    def power_watts(self, lights_w: float = 400.0, fans_w: float = 300.0, projector_w: float = 250.0) -> float:
        total = 0.0
        if self.lights:
            total += lights_w
        if self.fans:
            total += fans_w
        if self.projector:
            total += projector_w
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

    def model_post_init(self, __context: Any) -> None:
        self.is_occupied = self.students_count > 0


class ManualInputRequest(BaseModel):
    students_count: int = Field(..., ge=0, le=100, description="Students in classroom (0-100)")
    temperature: float = Field(..., ge=15.0, le=45.0, description="Temperature in °C (15-45)")
    light_intensity: float = Field(..., ge=0.0, le=1000.0, description="Ambient light intensity in lux (0-1000)")
    activity: ActivityType = ActivityType.LECTURE
    door_status: DoorWindowStatus = DoorWindowStatus.CLOSED
    window_status: DoorWindowStatus = DoorWindowStatus.CLOSED
    simulated_time: Optional[str] = None


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
    sim_minutes_per_step: int = 15


class SimulationMetrics(BaseModel):
    total_energy_kwh: float = 0.0
    baseline_energy_kwh: float = 0.0
    energy_saved_kwh: float = 0.0
    savings_percentage: float = 0.0
    current_power_w: float = 0.0
    baseline_power_w: float = 950.0
    average_comfort: float = 100.0
    total_steps: int = 0
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


class AnalyticsResponse(BaseModel):
    total_energy_kwh: float
    baseline_energy_kwh: float
    energy_saved_kwh: float
    savings_percentage: float
    current_power_w: float
    baseline_power_w: float
    average_comfort: float
    device_runtime_minutes: Dict[str, int]
    history_points: List[AnalyticsDataPoint]
