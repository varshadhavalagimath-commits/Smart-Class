from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, List, Optional
from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentDecision,
    AgentType,
    SimulationConfig,
    ZONE_FAN_MAPPING,
    FAN_ZONE_MAPPING,
    LIGHTS_POWER_W,
    PROJECTOR_POWER_W,
    FAN_POWER_PER_UNIT_W,
    TOTAL_FAN_COUNT,
    MAX_FAN_POWER_W,
    MAX_TOTAL_POWER_W
)


def calculate_comfort_score(
    percepts: ClassroomPercepts,
    devices: DeviceState,
    light_threshold: float = 300.0,
    temp_min: float = 22.0,
    temp_max: float = 26.0
) -> float:
    """
    Calculates comfort score from 0 to 100 based on visual comfort and zone-level thermal comfort.
    If classroom is vacant (0 students, no teacher), no human discomfort exists -> 100.
    """
    if not percepts.is_occupied:
        return 100.0

    # 1. Visual comfort (40% weight)
    effective_light = percepts.light_intensity + (320.0 if devices.lights else 0.0)
    if effective_light >= light_threshold:
        visual_score = 100.0
        if percepts.light_intensity > 750.0 and devices.lights:
            visual_score = 85.0
    else:
        deficit = light_threshold - effective_light
        visual_score = max(10.0, 100.0 - (deficit / light_threshold) * 80.0)

    # 2. Zone-level Thermal & Airflow Comfort (60% weight)
    temp = percepts.temperature
    occupied_zones = [z for z in percepts.zones.values() if z.is_occupied]
    if not occupied_zones:
        thermal_score = 100.0
    else:
        zone_scores = []
        for z in occupied_zones:
            # Active fans covering this zone
            fans_in_zone = z.fans
            active_fans = [f for f in fans_in_zone if devices.fan_states.get(f, False)]
            has_airflow = len(active_fans) > 0

            # Check explicit preferences
            has_on_request = (z.student_preference == "on" or z.teacher_preference == "on")
            has_off_request = (z.teacher_preference == "off" or (z.student_preference == "off" and z.teacher_preference != "on"))

            if temp > temp_max:
                # Hot temperature (>26°C)
                if has_off_request and not has_airflow:
                    # User explicitly requested OFF despite heat -> honor request
                    z_score = 85.0
                elif has_airflow:
                    # Effective cooling airflow provided
                    needed_fans = 2 if z.students_count > 10 else 1
                    if len(active_fans) >= needed_fans:
                        z_score = 95.0
                    else:
                        z_score = 80.0  # Partial airflow
                else:
                    # No fan in hot occupied zone -> severe discomfort
                    z_score = max(10.0, 80.0 - (temp - temp_max) * 14.0)
            elif temp < temp_min:
                # Cold temperature (<22°C)
                if has_on_request and has_airflow:
                    # User explicitly requested fan in cold room -> comfort satisfied by preference
                    z_score = 95.0
                elif has_airflow and not has_on_request:
                    # Unwanted chill draft
                    z_score = max(15.0, 75.0 - (temp_min - temp) * 12.0)
                else:
                    # Fans OFF in cold room is normal
                    z_score = 95.0
            else:
                # Moderate/comfortable temperature (22-26°C)
                if has_airflow:
                    z_score = 95.0 if has_on_request else 88.0
                else:
                    z_score = 75.0 if has_on_request else 100.0

            zone_scores.append(z_score)

        thermal_score = sum(zone_scores) / len(zone_scores)

    return round((visual_score * 0.4) + (thermal_score * 0.6), 1)


def calculate_energy_efficiency_score(devices: DeviceState) -> float:
    """
    Calculates energy efficiency score from 0 to 100.
    0 W consumed = 100 score.
    1130 W (all lights, projector, 8 fans ON) = 5.0 score.
    """
    power = devices.power_watts()
    score = 100.0 * (1.0 - (power / (MAX_TOTAL_POWER_W * 1.05)))
    return round(max(0.0, min(100.0, score)), 1)


def calculate_occupancy_coverage_score(percepts: ClassroomPercepts, devices: DeviceState) -> float:
    """
    Measures how accurately fans target occupied zones and avoid empty zones.
    Score from 0 to 100.
    - Fans running in empty zones penalize score.
    - Occupied zones receiving appropriate airflow earn score.
    """
    if not percepts.is_occupied:
        # Classroom empty: any active fan is a severe waste
        if devices.active_fan_count == 0:
            return 100.0
        else:
            return max(0.0, 100.0 - (devices.active_fan_count * 20.0))

    score = 100.0
    for z_id, z in percepts.zones.items():
        fans_in_zone = z.fans
        active_in_zone = [f for f in fans_in_zone if devices.fan_states.get(f, False)]

        if not z.is_occupied:
            # Empty zone should NOT have fans running
            if len(active_in_zone) > 0:
                score -= 22.0 * len(active_in_zone)
        else:
            # Occupied zone
            needs_cooling = (percepts.temperature > 26.0) or (z.student_preference == "on" or z.teacher_preference == "on")
            prefers_off = (z.teacher_preference == "off" or (z.student_preference == "off" and z.teacher_preference != "on"))

            if needs_cooling and not prefers_off:
                if len(active_in_zone) == 0:
                    score -= 25.0  # Occupied zone left unserved
            elif not needs_cooling and not prefers_off:
                if len(active_in_zone) > 0 and percepts.temperature < 22.0:
                    score -= 15.0 * len(active_in_zone)

    return max(0.0, min(100.0, round(score, 1)))


def calculate_preference_satisfaction_score(percepts: ClassroomPercepts, devices: DeviceState) -> float:
    """
    Measures ratio of satisfied student and teacher fan requests (0 to 100).
    """
    requests_total = 0
    requests_satisfied = 0

    # 1. Teacher specific fan request
    if percepts.teacher_target_fan is not None:
        requests_total += 1
        fan_on = devices.fan_states.get(percepts.teacher_target_fan, False)
        if percepts.teacher_preference == "off":
            if not fan_on:
                requests_satisfied += 1
        else:
            if fan_on:
                requests_satisfied += 1

    # 2. Zone-level preferences
    for z in percepts.zones.values():
        has_active = any(devices.fan_states.get(f, False) for f in z.fans)

        # Teacher preference in this zone
        if z.teacher_present and z.teacher_preference != "no_preference" and percepts.teacher_target_fan is None:
            requests_total += 1
            if z.teacher_preference == "on" and has_active:
                requests_satisfied += 1
            elif z.teacher_preference == "off" and not has_active:
                requests_satisfied += 1

        # Student preference in this zone
        if z.students_count > 0 and z.student_preference != "no_preference":
            requests_total += 1
            # If conflict with teacher, teacher takes precedence
            expected_on = (z.student_preference == "on")
            if z.teacher_present and z.teacher_preference != "no_preference":
                expected_on = (z.teacher_preference == "on")

            if expected_on and has_active:
                requests_satisfied += 1
            elif not expected_on and not has_active:
                requests_satisfied += 1

    if requests_total == 0:
        return 100.0

    return round((requests_satisfied / requests_total) * 100.0, 1)


def calculate_total_utility(
    comfort: float,
    efficiency: float,
    coverage: float,
    preference: float,
    w_comfort: float = 0.35,
    w_energy: float = 0.30,
    w_coverage: float = 0.20,
    w_preference: float = 0.15
) -> float:
    """
    Configurable dynamic zone fan utility formula:
    Utility = 0.35*Comfort + 0.30*EnergyEfficiency + 0.20*OccupancyCoverage + 0.15*PreferenceSatisfaction
    """
    u = (w_comfort * comfort) + (w_energy * efficiency) + (w_coverage * coverage) + (w_preference * preference)
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
