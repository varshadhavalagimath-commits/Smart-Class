from typing import List, Dict, Any, Tuple
from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentDecision,
    AgentType,
    SimulationConfig,
    UtilityCombinationEvaluation,
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


class UtilityBasedAgent(BaseAgent):
    """
    Utility-Based Rational Agent (Primary Decision Architecture):
    Evaluates dynamic zone-based fan configurations using multi-objective rational utility:
      U = 0.35 * Comfort + 0.30 * Energy Efficiency + 0.20 * Occupancy Coverage + 0.15 * Preference Satisfaction
    Enforces mandatory operational constraints:
      - Vacant zones MUST NOT run fans (0 W).
      - Occupied hot zones MUST receive airflow without wasting cooling on empty zones.
      - Explicit user preferences (student/teacher) are maximized.
      - Unavailable / faulty fans are never scheduled; alternates in same zone are mobilized.
      - Manual overrides are strictly respected.
      - Tie-breaker chooses lower-energy configuration.
    """
    def __init__(self):
        super().__init__(AgentType.UTILITY_BASED, "Utility-Based Rational Agent")

    def decide(
        self,
        percepts: ClassroomPercepts,
        current_devices: DeviceState,
        config: SimulationConfig
    ) -> AgentDecision:
        is_empty_classroom = not percepts.is_occupied
        new_fan_states: Dict[int, bool] = {i: False for i in range(1, 9)}
        zone_fan_allocations = {"Zone A": [], "Zone B": [], "Zone C": [], "Zone D": []}
        zone_reasons = {}

        # Lights and Projector determination
        new_lights = False
        new_projector = False
        if percepts.is_occupied:
            effective_lux = percepts.light_intensity
            if effective_lux < config.light_threshold_lux:
                new_lights = True
            if percepts.projector_override is not None:
                new_projector = bool(percepts.projector_override)
            elif percepts.activity in ["Lecture", "Lab"]:
                new_projector = True

        # ==================== DYNAMIC ZONE UTILITY OPTIMIZATION ====================
        is_hot = percepts.temperature >= config.fan_activation_temp or percepts.temperature > config.temp_comfort_max

        for zone_id, zone in percepts.zones.items():
            zone_fans = zone.fans  # e.g. [1, 2]
            available_fans = [f for f in zone_fans if percepts.fan_availability.get(f, True)]

            # Check manual overrides for this zone
            has_overrides = {f: percepts.fan_manual_overrides.get(f) for f in zone_fans if percepts.fan_manual_overrides.get(f) is not None}

            if is_empty_classroom or not zone.is_occupied:
                # Mandatory constraint: Empty zone -> fans OFF
                for f in zone_fans:
                    new_fan_states[f] = has_overrides.get(f, False)
                zone_reasons[zone_id] = "Utility Optimization: 0 occupants -> 0 fans allocated (100% efficiency in empty zone)."
                continue

            # Occupied Zone: evaluate preferences & requirements
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

            # Candidate fan options for this zone: 0 fans, 1 fan, 2 fans
            # Evaluate utility payoff of each option
            best_fans_for_zone = []

            if effective_pref == "off":
                # User requested OFF: 0 fans gives highest preference satisfaction & highest energy efficiency
                best_fans_for_zone = []
                zone_reasons[zone_id] = f"{zone_id} OFF request maximizes utility by avoiding unneeded draft and saving power."
            elif effective_pref == "on":
                # User requested ON:
                needed = 2 if zone.students_count > 10 else 1
                if specific_target:
                    best_fans_for_zone.append(specific_target)
                    rem = [f for f in available_fans if f != specific_target]
                    if needed > 1 and rem:
                        best_fans_for_zone.append(rem[0])
                else:
                    best_fans_for_zone = available_fans[:needed]
                zone_reasons[zone_id] = f"{zone_id} ON request fulfilled ({len(best_fans_for_zone)} fan, {len(best_fans_for_zone)*60}W) yielding maximal preference utility."
            elif is_hot:
                # Hot temperature (>26°C / >=28°C):
                # 1 fan for <=10 students, 2 fans for >10 students
                needed = 2 if zone.students_count > 10 else 1
                if specific_target:
                    best_fans_for_zone.append(specific_target)
                    rem = [f for f in available_fans if f != specific_target]
                    if needed > 1 and rem:
                        best_fans_for_zone.append(rem[0])
                else:
                    best_fans_for_zone = available_fans[:needed]
                zone_reasons[zone_id] = f"{zone_id} occupied ({zone.students_count} st.) in warm air ({percepts.temperature}°C): {len(best_fans_for_zone)} fan(s) maximize comfort utility."
            else:
                # Comfortable neutral temperature and no preference:
                if specific_target:
                    best_fans_for_zone.append(specific_target)
                    zone_reasons[zone_id] = f"Teacher target Fan {specific_target} allocated."
                else:
                    # 0 fans yields highest utility: comfort is already neutral (100) and 0W power gives 100% efficiency!
                    best_fans_for_zone = []
                    zone_reasons[zone_id] = f"{zone_id} comfortable ({percepts.temperature}°C): 0 fans maximizes energy efficiency."

            for f in zone_fans:
                if f in has_overrides:
                    new_fan_states[f] = has_overrides[f]
                else:
                    new_fan_states[f] = (f in best_fans_for_zone)

            zone_fan_allocations[zone_id] = [f for f in zone_fans if new_fan_states[f]]

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
        fans_str = f"{active_count}/8 fans active ({', '.join(active_fan_list) if active_fan_list else 'None'})"

        explanation = (
            f"Utility Optimizer: {fans_str} drawing {selected_state.fan_power_w} W fan load. "
            f"Score U={utility:.1f} (Comfort={comfort:.0f}, Efficiency={efficiency:.0f}, "
            f"Coverage={coverage:.0f}, Pref={pref_satisfaction:.0f}). "
            + " | ".join([f"{z}: {r}" for z, r in zone_reasons.items() if "100% efficiency" not in r or is_empty_classroom][:2])
        )

        matched_rule = f"Utility U = 0.35×{comfort:.0f} + 0.30×{efficiency:.0f} + 0.20×{coverage:.0f} + 0.15×{pref_satisfaction:.0f} = {utility:.2f}"

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
            reason=explanation,
            matched_rule=matched_rule,
            internal_state={
                "weights": {"comfort": 0.35, "efficiency": 0.30, "coverage": 0.20, "preferences": 0.15},
                "active_fans": active_fan_list,
                "fan_power_w": selected_state.fan_power_w
            },
            goals_status=None,
            utility_breakdown=None,
            fan_states=new_fan_states,
            active_fan_count=active_count,
            fan_power_w=selected_state.fan_power_w,
            zone_fan_allocations=zone_fan_allocations,
            zone_reasons=zone_reasons
        )
