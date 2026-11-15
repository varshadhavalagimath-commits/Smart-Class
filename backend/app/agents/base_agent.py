from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentDecision,
    AgentType,
    SimulationConfig
)

# Standard rated power (Watts)
LIGHTS_POWER_W = 400.0
FANS_POWER_W = 300.0
PROJECTOR_POWER_W = 250.0
MAX_POWER_W = LIGHTS_POWER_W + FANS_POWER_W + PROJECTOR_POWER_W  # 950 W


def calculate_comfort_score(
    percepts: ClassroomPercepts,
    devices: DeviceState,
    light_threshold: float = 300.0,
    temp_min: float = 22.0,
    temp_max: float = 26.0
) -> float:
    """
    Calculates comfort score from 0 to 100 based on visual and thermal comfort.
    If classroom is vacant (0 students), no human discomfort exists -> 100.
    """
    if percepts.students_count == 0:
        return 100.0

    # Visual comfort (50% weight)
    # Effective light = ambient light + artificial light boost (+300 lux if lights ON)
    effective_light = percepts.light_intensity + (320.0 if devices.lights else 0.0)
    if effective_light >= light_threshold:
        visual_score = 100.0
        # Slight penalty for extreme glare if ambient already > 800 and lights turned ON
        if percepts.light_intensity > 750.0 and devices.lights:
            visual_score = 85.0
    else:
        # Deficit penalty
        deficit = light_threshold - effective_light
        visual_score = max(10.0, 100.0 - (deficit / light_threshold) * 80.0)

    # Thermal comfort (50% weight)
    temp = percepts.temperature
    if temp < temp_min:
        # Too cold
        # If fans are ON when cold, strong discomfort penalty
        if devices.fans:
            thermal_score = max(10.0, 80.0 - (temp_min - temp) * 10.0 - 25.0)
        else:
            thermal_score = max(40.0, 100.0 - (temp_min - temp) * 8.0)
    elif temp > temp_max:
        # Hot condition
        # If fans are ON, perceived temp drops by 3.5°C due to evaporative cooling airflow
        if devices.fans:
            effective_temp = max(temp_min, temp - 3.5)
            if effective_temp <= temp_max:
                thermal_score = 95.0
            else:
                thermal_score = max(30.0, 95.0 - (effective_temp - temp_max) * 8.0)
        else:
            # Fans OFF in high temperature -> severe discomfort in classroom
            thermal_score = max(5.0, 85.0 - (temp - temp_max) * 16.0)
    else:
        # Naturally comfortable (22-26°C)
        if devices.fans:
            # Mild unnecessary draft
            thermal_score = 90.0
        else:
            thermal_score = 100.0

    return round((visual_score * 0.5) + (thermal_score * 0.5), 1)


def calculate_energy_efficiency_score(devices: DeviceState) -> float:
    """
    Calculates energy efficiency score from 0 to 100.
    0 W consumed = 100 score.
    950 W (all devices ON) = 5.0 score.
    """
    power = devices.power_watts(LIGHTS_POWER_W, FANS_POWER_W, PROJECTOR_POWER_W)
    score = 100.0 * (1.0 - (power / (MAX_POWER_W * 1.05)))
    return round(max(0.0, min(100.0, score)), 1)


def calculate_operational_compliance_score(
    percepts: ClassroomPercepts,
    devices: DeviceState,
    light_threshold: float = 300.0
) -> float:
    """
    Calculates operational compliance score from 0 to 100 based on policy adherence:
    - Vacant classroom: unnecessary devices must be OFF.
    - Active lecture/lab: projector required; adequate light required.
    - Break/No class: projector should be OFF.
    """
    score = 100.0

    # Rule 1: Vacant classroom
    if percepts.students_count == 0:
        if devices.lights:
            score -= 35.0
        if devices.fans:
            score -= 35.0
        if devices.projector:
            score -= 30.0
        return max(0.0, round(score, 1))

    # Rule 2: Active class requirements (students > 0)
    effective_light = percepts.light_intensity + (320.0 if devices.lights else 0.0)
    if effective_light < light_threshold:
        score -= 40.0  # Inadequate light for students is non-compliant

    # Rule 3: Projector requirements
    if percepts.activity in ["Lecture", "Lab"]:
        if not devices.projector:
            score -= 30.0  # Presentation display missing during active instructional session
    elif percepts.activity in ["Break", "No class"]:
        if devices.projector:
            score -= 25.0  # Projector left idling during break/recess

    # Rule 4: Fan when cold
    if percepts.temperature < 20.0 and devices.fans:
        score -= 20.0

    return max(0.0, round(score, 1))


def calculate_total_utility(
    comfort: float,
    efficiency: float,
    compliance: float,
    w_comfort: float = 0.45,
    w_energy: float = 0.40,
    w_compliance: float = 0.15
) -> float:
    """
    Standard utility formula:
    U = 0.45 * Comfort + 0.40 * Energy Efficiency + 0.15 * Operational Compliance
    """
    u = (w_comfort * comfort) + (w_energy * efficiency) + (w_compliance * compliance)
    return round(u, 2)


class BaseAgent(ABC):
    def __init__(self, agent_type: AgentType, agent_name: str):
        self.agent_type = agent_type
        self.agent_name = agent_name

    @abstractmethod
    def decide(
        self,
        percepts: ClassroomPercepts,
        current_devices: DeviceState,
        config: SimulationConfig
    ) -> AgentDecision:
        pass
