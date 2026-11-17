from typing import Dict, List, Any
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


class SimpleReflexAgent(BaseAgent):
    """
    Simple Reflex Agent with Dynamic Zone-Based Fan Control:
    Acts directly on current sensor readings and zone occupancy using Condition-Action rules.
    Activates ONLY fans in occupied zones that require cooling or have explicit requests.
    """
    def __init__(self):
        super().__init__(AgentType.SIMPLE_REFLEX, "Simple Reflex Agent")

    def decide(
        self,
        percepts: ClassroomPercepts,
        current_devices: DeviceState,
        config: SimulationConfig
    ) -> AgentDecision:
        rules_triggered = []
        zone_reasons = {}
        zone_fan_allocations = {"Zone A": [], "Zone B": [], "Zone C": [], "Zone D": []}
        new_fan_states: Dict[int, bool] = {i: False for i in range(1, 9)}

        # Check Lights & Projector rules
        if not percepts.is_occupied:
            new_lights = False
            new_projector = False
            rules_triggered.append("[Rule R-Vacant] Occupancy == 0 -> Lights=OFF, Projector=OFF")
        else:
            if percepts.light_intensity < config.light_threshold_lux:
                new_lights = True
                rules_triggered.append(f"[Rule R-Light-Low] Lux ({percepts.light_intensity:.0f}) < {config.light_threshold_lux:.0f} -> Lights=ON")
            else:
                new_lights = False
                rules_triggered.append(f"[Rule R-Light-OK] Lux ({percepts.light_intensity:.0f}) >= {config.light_threshold_lux:.0f} -> Lights=OFF")

            if percepts.activity in ["Lecture", "Lab"]:
                new_projector = True
                rules_triggered.append(f"[Rule R-Media] Activity ({percepts.activity.value}) -> Projector=ON")
            else:
                new_projector = False
                rules_triggered.append(f"[Rule R-Media] Activity ({percepts.activity.value}) -> Projector=OFF")

        # ==================== DYNAMIC ZONE FAN ALLOCATION RULES ====================
        is_empty_classroom = not percepts.is_occupied

        for zone_id, zone in percepts.zones.items():
            zone_fans = zone.fans  # e.g. [1, 2]
            available_fans = [f for f in zone_fans if percepts.fan_availability.get(f, True)]

            # Check if classroom is completely empty
            if is_empty_classroom:
                for f in zone_fans:
                    override = percepts.fan_manual_overrides.get(f)
                    if override is not None:
                        new_fan_states[f] = override
                        rules_triggered.append(f"[Rule R-Override] Fan {f} manual override: {'ON' if override else 'OFF'}")
                    else:
                        new_fan_states[f] = False
                zone_reasons[zone_id] = "Vacant classroom: all zone fans kept OFF to eliminate idle energy waste."
                continue

            # Check if this zone is empty
            if not zone.is_occupied:
                for f in zone_fans:
                    override = percepts.fan_manual_overrides.get(f)
                    if override is not None:
                        new_fan_states[f] = override
                        rules_triggered.append(f"[Rule R-Override] Fan {f} manual override: {'ON' if override else 'OFF'}")
                    else:
                        new_fan_states[f] = False
                zone_reasons[zone_id] = f"{zone_id} is unoccupied (0 students): fans kept OFF."
                continue

            # Zone is occupied: evaluate zone requirements
            # 1. Resolve student vs teacher preferences
            # Priority rule: Teacher preference takes priority if present and set
            effective_pref = "no_preference"
            if zone.teacher_present and zone.teacher_preference != "no_preference":
                effective_pref = zone.teacher_preference
                if zone.student_preference != "no_preference" and zone.student_preference != zone.teacher_preference:
                    rules_triggered.append(f"[Rule R-Conflict] {zone_id} teacher pref '{zone.teacher_preference}' takes precedence over student '{zone.student_preference}'")
            elif zone.student_preference != "no_preference":
                effective_pref = zone.student_preference

            # 2. Check teacher specific fan target (e.g. Fan 1 requested)
            teacher_target_fan = percepts.teacher_target_fan
            specific_fan_requested = None
            if teacher_target_fan in zone_fans and percepts.teacher_zone == zone_id:
                if percepts.fan_availability.get(teacher_target_fan, True):
                    specific_fan_requested = teacher_target_fan
                else:
                    rules_triggered.append(f"[Rule R-Fault] Requested Fan {teacher_target_fan} is unavailable/faulty! Falling back to alternate fan in {zone_id}.")

            # 3. Determine needed fan count in this zone
            # Activation temperature: config.fan_activation_temp (default 28°C) or > 26°C comfort max
            is_hot = percepts.temperature >= config.fan_activation_temp or percepts.temperature > config.temp_comfort_max
            is_cold = percepts.temperature < config.temp_comfort_min

            fans_to_turn_on = []

            if effective_pref == "off":
                # Explicit request to turn off fans
                rules_triggered.append(f"[Rule R-Pref-OFF] {zone_id} preference requested fans OFF.")
                zone_reasons[zone_id] = f"{zone_id} occupants requested airflow OFF."
            elif effective_pref == "on":
                # Explicit ON request (honored even in cold temperatures)
                rules_triggered.append(f"[Rule R-Pref-ON] {zone_id} requested fans ON (Temp: {percepts.temperature}°C).")
                # Allocate 1 fan (or 2 if occupancy > 10)
                needed_count = 2 if zone.students_count > 10 else 1
                if specific_fan_requested:
                    fans_to_turn_on.append(specific_fan_requested)
                    # Add second fan if needed and available
                    remaining_available = [f for f in available_fans if f != specific_fan_requested]
                    if needed_count > 1 and remaining_available:
                        fans_to_turn_on.append(remaining_available[0])
                else:
                    fans_to_turn_on = available_fans[:needed_count]
                zone_reasons[zone_id] = f"{zone_id} fan ON request satisfied ({len(fans_to_turn_on)} fan active)."
            elif is_hot:
                # Hot temperature with occupants in this zone
                needed_count = 2 if zone.students_count > 10 else 1
                if specific_fan_requested:
                    fans_to_turn_on.append(specific_fan_requested)
                    remaining = [f for f in available_fans if f != specific_fan_requested]
                    if needed_count > 1 and remaining:
                        fans_to_turn_on.append(remaining[0])
                else:
                    fans_to_turn_on = available_fans[:needed_count]
                rules_triggered.append(f"[Rule R-Heat-Zone] {zone_id} occupied ({zone.students_count} st.) in high heat ({percepts.temperature}°C) -> {len(fans_to_turn_on)} fan(s) ON")
                zone_reasons[zone_id] = f"{zone_id} occupied ({zone.students_count} students) at {percepts.temperature}°C: activated {len(fans_to_turn_on)} fan(s)."
            else:
                # Moderate or cold temperature without preference
                if specific_fan_requested:
                    fans_to_turn_on.append(specific_fan_requested)
                    rules_triggered.append(f"[Rule R-Target-Fan] Teacher requested specific Fan {specific_fan_requested} ON in {zone_id}.")
                    zone_reasons[zone_id] = f"Teacher target Fan {specific_fan_requested} activated."
                else:
                    rules_triggered.append(f"[Rule R-Neutral] {zone_id} temp {percepts.temperature}°C within comfort zone and no fan request -> fans OFF")
                    zone_reasons[zone_id] = f"{zone_id} temperature {percepts.temperature}°C comfortable: fans OFF."

            # Apply states to fans in this zone, honoring manual overrides
            for f in zone_fans:
                override = percepts.fan_manual_overrides.get(f)
                if override is not None:
                    new_fan_states[f] = override
                    rules_triggered.append(f"[Rule R-Override] Fan {f} manual override: {'ON' if override else 'OFF'}")
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
        fans_summary = f"{active_count}/8 fans active ({', '.join(active_fan_list) if active_fan_list else 'None'})"

        overall_reason = f"Simple Reflex Condition-Action: {fans_summary}. " + " | ".join([f"{zid}: {reas}" for zid, reas in zone_reasons.items() if "fans kept OFF" not in reas or is_empty_classroom][:2])

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
            reason=overall_reason,
            matched_rule="\n".join(rules_triggered[:8]),
            internal_state={"architecture": "Dynamic Zone-Based Production Rules", "active_fans": active_fan_list},
            goals_status=None,
            utility_breakdown=None,
            fan_states=new_fan_states,
            active_fan_count=active_count,
            fan_power_w=selected_state.fan_power_w,
            zone_fan_allocations=zone_fan_allocations,
            zone_reasons=zone_reasons
        )
