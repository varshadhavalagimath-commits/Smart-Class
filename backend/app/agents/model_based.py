from typing import Optional, Dict, Any, List
from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentDecision,
    AgentType,
    SimulationConfig,
    ZONE_FAN_MAPPING,
    FAN_ZONE_MAPPING
)
from app.agents.base_agent import (
    BaseAgent,
    calculate_comfort_score,
    calculate_energy_efficiency_score,
    calculate_occupancy_coverage_score,
    calculate_preference_satisfaction_score,
    calculate_total_utility,
    LIGHTS_POWER_W,
    PROJECTOR_POWER_W,
    FAN_POWER_PER_UNIT_W
)


class ModelBasedAgent(BaseAgent):
    """
    Model-Based Agent with Dynamic Zone-Based Fan Control:
    Maintains an internal state of previous zone occupancies, previous fan states,
    consecutive zero readings per zone, and temperature trends.
    Uses temporal memory to prevent rapid fan cycling and filters transient sensor dropouts per zone.
    """
    def __init__(self):
        super().__init__(AgentType.MODEL_BASED, "Model-Based Agent")
        self.previous_percepts: Optional[ClassroomPercepts] = None
        self.previous_device_state: Optional[DeviceState] = None
        self.consecutive_empty_per_zone: Dict[str, int] = {"Zone A": 0, "Zone B": 0, "Zone C": 0, "Zone D": 0}
        self.consecutive_empty_classroom: int = 0
        self.smoothed_temperature: Optional[float] = None
        self.smoothed_light: Optional[float] = None

    def reset_internal_state(self):
        self.previous_percepts = None
        self.previous_device_state = None
        self.consecutive_empty_per_zone = {"Zone A": 0, "Zone B": 0, "Zone C": 0, "Zone D": 0}
        self.consecutive_empty_classroom = 0
        self.smoothed_temperature = None
        self.smoothed_light = None

    def decide(
        self,
        percepts: ClassroomPercepts,
        current_devices: DeviceState,
        config: SimulationConfig
    ) -> AgentDecision:
        # 1. Update exponential moving averages for environmental percepts
        alpha = 0.65
        if self.smoothed_temperature is None:
            self.smoothed_temperature = percepts.temperature
        else:
            self.smoothed_temperature = round(alpha * percepts.temperature + (1 - alpha) * self.smoothed_temperature, 1)

        if self.smoothed_light is None:
            self.smoothed_light = percepts.light_intensity
        else:
            self.smoothed_light = round(alpha * percepts.light_intensity + (1 - alpha) * self.smoothed_light, 1)

        # 2. Temperature trend
        temp_trend = "Stable"
        if self.previous_percepts is not None:
            delta_t = percepts.temperature - self.previous_percepts.temperature
            if delta_t > 0.4:
                temp_trend = f"Rising (+{delta_t:.1f}°C)"
            elif delta_t < -0.4:
                temp_trend = f"Falling ({delta_t:.1f}°C)"

        # 3. Overall classroom vacancy tracking
        if not percepts.is_occupied:
            self.consecutive_empty_classroom += 1
        else:
            self.consecutive_empty_classroom = 0

        # Lights & Projector decisions
        new_lights = False
        new_projector = False
        if percepts.is_occupied:
            new_lights = self.smoothed_light < config.light_threshold_lux
            if percepts.activity in ["Lecture", "Lab"]:
                new_projector = True
            else:
                new_projector = False

        # ==================== ZONE-WISE FAN MODEL LOGIC ====================
        new_fan_states: Dict[int, bool] = {i: False for i in range(1, 9)}
        zone_reasons = {}
        zone_fan_allocations = {"Zone A": [], "Zone B": [], "Zone C": [], "Zone D": []}
        glitch_filtered_zones = []

        is_hot = self.smoothed_temperature >= config.fan_activation_temp or self.smoothed_temperature > config.temp_comfort_max

        for zone_id, zone in percepts.zones.items():
            zone_fans = zone.fans
            available_fans = [f for f in zone_fans if percepts.fan_availability.get(f, True)]

            # Check consecutive zero readings in this zone
            prev_zone_count = 0
            if self.previous_percepts and zone_id in self.previous_percepts.zones:
                prev_zone_count = self.previous_percepts.zones[zone_id].students_count

            if not zone.is_occupied:
                self.consecutive_empty_per_zone[zone_id] += 1
            else:
                self.consecutive_empty_per_zone[zone_id] = 0

            # Transient glitch / occlusion detection per zone:
            # If zone was occupied previously with >= 5 students during active class,
            # and suddenly reads 0, require 2 consecutive zero readings before switching OFF
            zone_glitch_suspected = False
            if zone.students_count == 0 and not zone.teacher_present:
                if prev_zone_count >= 5 and self.consecutive_empty_per_zone[zone_id] < 2:
                    zone_glitch_suspected = True
                    glitch_filtered_zones.append(zone_id)

            # Check manual overrides for fans in this zone
            has_overrides = {f: percepts.fan_manual_overrides.get(f) for f in zone_fans if percepts.fan_manual_overrides.get(f) is not None}

            if not zone.is_occupied and not zone_glitch_suspected:
                # Confirmed empty zone
                for f in zone_fans:
                    if f in has_overrides:
                        new_fan_states[f] = has_overrides[f]
                    else:
                        new_fan_states[f] = False
                zone_reasons[zone_id] = f"{zone_id} confirmed vacant ({self.consecutive_empty_per_zone[zone_id]} streak): fans OFF."
                continue

            if zone_glitch_suspected:
                # Maintain previous fan state for this zone to avoid jarring shutoff during lecture
                prev_fans_on = []
                if self.previous_device_state:
                    prev_fans_on = [f for f in zone_fans if self.previous_device_state.fan_states.get(f, False)]

                for f in zone_fans:
                    if f in has_overrides:
                        new_fan_states[f] = has_overrides[f]
                    else:
                        new_fan_states[f] = (f in prev_fans_on)
                zone_reasons[zone_id] = f"Potential sensor dropout in {zone_id} (previously {prev_zone_count} students). Memory model maintains fan state pending verification."
                zone_fan_allocations[zone_id] = [f for f in zone_fans if new_fan_states[f]]
                continue

            # Zone is actively occupied:
            # Resolve preferences with teacher priority
            effective_pref = "no_preference"
            if zone.teacher_present and zone.teacher_preference != "no_preference":
                effective_pref = zone.teacher_preference
            elif zone.student_preference != "no_preference":
                effective_pref = zone.student_preference

            # Teacher specific target fan
            teacher_target_fan = percepts.teacher_target_fan
            specific_target = None
            if teacher_target_fan in zone_fans and percepts.teacher_zone == zone_id and percepts.fan_availability.get(teacher_target_fan, True):
                specific_target = teacher_target_fan

            fans_to_turn_on = []

            if effective_pref == "off":
                zone_reasons[zone_id] = f"{zone_id} occupant preference: OFF."
            elif effective_pref == "on":
                needed = 2 if zone.students_count > 10 else 1
                if specific_target:
                    fans_to_turn_on.append(specific_target)
                    rem = [f for f in available_fans if f != specific_target]
                    if needed > 1 and rem:
                        fans_to_turn_on.append(rem[0])
                else:
                    fans_to_turn_on = available_fans[:needed]
                zone_reasons[zone_id] = f"{zone_id} explicit ON preference fulfilled ({len(fans_to_turn_on)} fan active)."
            elif is_hot:
                # Hysteresis / proactive cooling with temperature trend
                needed = 2 if zone.students_count > 10 else 1
                if specific_target:
                    fans_to_turn_on.append(specific_target)
                    rem = [f for f in available_fans if f != specific_target]
                    if needed > 1 and rem:
                        fans_to_turn_on.append(rem[0])
                else:
                    fans_to_turn_on = available_fans[:needed]
                zone_reasons[zone_id] = f"{zone_id} occupied ({zone.students_count} st.) in warm air ({self.smoothed_temperature}°C, {temp_trend}): {len(fans_to_turn_on)} fan(s) active."
            else:
                if specific_target:
                    fans_to_turn_on.append(specific_target)
                    zone_reasons[zone_id] = f"Teacher requested Fan {specific_target} in {zone_id} activated."
                else:
                    zone_reasons[zone_id] = f"{zone_id} comfortable ({self.smoothed_temperature}°C): fans OFF."

            for f in zone_fans:
                if f in has_overrides:
                    new_fan_states[f] = has_overrides[f]
                else:
                    new_fan_states[f] = (f in fans_to_turn_on)

            zone_fan_allocations[zone_id] = [f for f in zone_fans if new_fan_states[f]]

        # Construct DeviceState
        selected_state = DeviceState(
            lights=new_lights,
            projector=new_projector,
            fan_states=new_fan_states,
            fan_availability=percepts.fan_availability,
            fan_overrides=percepts.fan_manual_overrides
        )

        comfort = calculate_comfort_score(percepts, selected_state, config.light_threshold_lux, config.temp_comfort_min, config.temp_comfort_max)
        efficiency = calculate_energy_efficiency_score(selected_state)
        coverage = calculate_occupancy_coverage_score(percepts, selected_state)
        pref_satisfaction = calculate_preference_satisfaction_score(percepts, selected_state)
        utility = calculate_total_utility(comfort, efficiency, coverage, pref_satisfaction)

        active_count = selected_state.active_fan_count
        active_fan_list = [f"Fan {f}" for f, s in new_fan_states.items() if s]

        internal_memory_snapshot = {
            "smoothed_temp_c": self.smoothed_temperature,
            "temp_trend": temp_trend,
            "consecutive_empty_per_zone": dict(self.consecutive_empty_per_zone),
            "glitch_filtered_zones": glitch_filtered_zones,
            "active_fans": active_fan_list
        }

        # Save previous state
        self.previous_percepts = percepts.model_copy(deep=True)
        self.previous_device_state = selected_state.model_copy(deep=True)

        reason = f"Model-Based Memory: {active_count}/8 fans active. Temp Trend: {temp_trend}. "
        if glitch_filtered_zones:
            reason += f"Filtered momentary occupancy dropouts in {', '.join(glitch_filtered_zones)}. "
        reason += " | ".join([f"{zid}: {r}" for zid, r in zone_reasons.items() if "fans OFF" not in r or not percepts.is_occupied][:2])

        return AgentDecision(
            agent_type=self.agent_type,
            agent_name=self.agent_name,
            previous_state=current_devices,
            selected_state=selected_state,
            power_w=selected_state.power_watts(),
            comfort_score=comfort,
            energy_efficiency_score=efficiency,
            operational_compliance_score=coverage,
            utility_score=utility,
            reason=reason,
            matched_rule=f"Internal State Model: Trend={temp_trend} | Vacancy Streaks={self.consecutive_empty_per_zone}",
            internal_state=internal_memory_snapshot,
            goals_status=None,
            utility_breakdown=None,
            fan_states=new_fan_states,
            active_fan_count=active_count,
            fan_power_w=selected_state.fan_power_w,
            zone_fan_allocations=zone_fan_allocations,
            zone_reasons=zone_reasons
        )
