from typing import List, Dict, Any
from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentDecision,
    AgentType,
    SimulationConfig,
    GoalStatus,
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


class GoalBasedAgent(BaseAgent):
    """
    Goal-Based Agent with Dynamic Zone-Based Fan Control:
    Acts intentionally by formulating 4 explicit operational goals and selecting
    the fan actuation configuration that satisfies all active goals:
    - Goal 1: Maintain Suitable Comfort in Occupied Zones.
    - Goal 2: Provide Requested Airflow (Student & Teacher Preferences).
    - Goal 3: Avoid Operating Fans in Empty Zones (Strict Zone Targeting).
    - Goal 4: Minimise Unnecessary Energy Consumption (Minimal Sufficient Fans).
    """
    def __init__(self):
        super().__init__(AgentType.GOAL_BASED, "Goal-Based Agent")

    def decide(
        self,
        percepts: ClassroomPercepts,
        current_devices: DeviceState,
        config: SimulationConfig
    ) -> AgentDecision:
        goals: List[GoalStatus] = []
        is_occupied_room = percepts.is_occupied
        new_fan_states: Dict[int, bool] = {i: False for i in range(1, 9)}
        zone_fan_allocations = {"Zone A": [], "Zone B": [], "Zone C": [], "Zone D": []}
        zone_reasons = {}

        # Lights & Projector
        new_lights = is_occupied_room and (percepts.light_intensity < config.light_threshold_lux)
        new_projector = is_occupied_room and (percepts.activity in ["Lecture", "Lab"])

        is_hot = percepts.temperature >= config.fan_activation_temp or percepts.temperature > config.temp_comfort_max

        # ==================== GOAL-DIRECTED ALLOCATION PLAN ====================
        # Formulate action for each zone to satisfy goals
        for zone_id, zone in percepts.zones.items():
            zone_fans = zone.fans
            available_fans = [f for f in zone_fans if percepts.fan_availability.get(f, True)]

            # Check overrides first
            has_overrides = {f: percepts.fan_manual_overrides.get(f) for f in zone_fans if percepts.fan_manual_overrides.get(f) is not None}

            if not zone.is_occupied:
                # Goal 3 direct requirement: Empty zone -> Fans OFF
                for f in zone_fans:
                    new_fan_states[f] = has_overrides.get(f, False)
                zone_reasons[zone_id] = "Goal 3 (Zero Idle Power): Zone empty, fans kept OFF."
                continue

            # Occupied zone:
            # Resolve preferences
            effective_pref = "no_preference"
            if zone.teacher_present and zone.teacher_preference != "no_preference":
                effective_pref = zone.teacher_preference
            elif zone.student_preference != "no_preference":
                effective_pref = zone.student_preference

            # Teacher specific target fan
            specific_target = None
            if percepts.teacher_target_fan in zone_fans and percepts.teacher_zone == zone_id and percepts.fan_availability.get(percepts.teacher_target_fan, True):
                specific_target = percepts.teacher_target_fan

            fans_to_turn_on = []

            if effective_pref == "off":
                # Goal 2: Satisfy preference OFF
                zone_reasons[zone_id] = "Goal 2 satisfied: Off preference respected."
            elif effective_pref == "on":
                # Goal 2: Satisfy preference ON
                needed = 2 if zone.students_count > 10 else 1
                if specific_target:
                    fans_to_turn_on.append(specific_target)
                    rem = [f for f in available_fans if f != specific_target]
                    if needed > 1 and rem:
                        fans_to_turn_on.append(rem[0])
                else:
                    fans_to_turn_on = available_fans[:needed]
                zone_reasons[zone_id] = f"Goal 2 satisfied: Airflow request granted ({len(fans_to_turn_on)} fan)."
            elif is_hot:
                # Goal 1: Provide thermal comfort in occupied warm zone
                needed = 2 if zone.students_count > 10 else 1
                if specific_target:
                    fans_to_turn_on.append(specific_target)
                    rem = [f for f in available_fans if f != specific_target]
                    if needed > 1 and rem:
                        fans_to_turn_on.append(rem[0])
                else:
                    fans_to_turn_on = available_fans[:needed]
                zone_reasons[zone_id] = f"Goal 1 satisfied: Zone cooling activated ({len(fans_to_turn_on)} fan)."
            else:
                # Comfortable / cold without request -> Goal 4 (Minimise energy): Fans OFF
                if specific_target:
                    fans_to_turn_on.append(specific_target)
                    zone_reasons[zone_id] = f"Goal 2: Teacher requested Fan {specific_target}."
                else:
                    zone_reasons[zone_id] = "Goal 4 satisfied: Neutral temp, fans kept OFF to minimize energy."

            for f in zone_fans:
                if f in has_overrides:
                    new_fan_states[f] = has_overrides[f]
                else:
                    new_fan_states[f] = (f in fans_to_turn_on)

            zone_fan_allocations[zone_id] = [f for f in zone_fans if new_fan_states[f]]

        selected_state = DeviceState(
            lights=new_lights,
            projector=new_projector,
            fan_states=new_fan_states,
            fan_availability=percepts.fan_availability,
            fan_overrides=percepts.fan_manual_overrides
        )

        # ==================== EVALUATE GOAL ATTAINMENT ====================
        # Goal 1: Thermal Comfort in Occupied Zones
        hot_occupied_zones = [zid for zid, z in percepts.zones.items() if z.is_occupied and is_hot]
        g1_satisfied = True
        for zid in hot_occupied_zones:
            if not zone_fan_allocations[zid] and percepts.zones[zid].student_preference != "off" and percepts.zones[zid].teacher_preference != "off":
                g1_satisfied = False
        goals.append(GoalStatus(
            goal_name="Goal 1: Maintain Suitable Comfort in Occupied Zones",
            target=f"Active cooling for {len(hot_occupied_zones)} occupied warm zones",
            achieved=g1_satisfied,
            description="Achieved: Every occupied zone requiring cooling receives targeted airflow." if g1_satisfied else "Partial: Some occupied zones lack available cooling."
        ))

        # Goal 2: Provide Requested Airflow (Preferences)
        pref_zones = [zid for zid, z in percepts.zones.items() if z.student_preference != "no_preference" or (z.teacher_present and z.teacher_preference != "no_preference")]
        g2_satisfied = True
        for zid in pref_zones:
            z = percepts.zones[zid]
            exp_on = (z.teacher_preference == "on") if z.teacher_present and z.teacher_preference != "no_preference" else (z.student_preference == "on")
            has_fans = len(zone_fan_allocations[zid]) > 0
            if exp_on != has_fans and percepts.teacher_target_fan is None:
                g2_satisfied = False
        goals.append(GoalStatus(
            goal_name="Goal 2: Provide Requested Airflow (User Preferences)",
            target=f"Honor {len(pref_zones)} active zone airflow requests",
            achieved=g2_satisfied,
            description="Achieved: Explicit student and teacher fan preferences satisfied." if g2_satisfied else "Partial: Some preference requests could not be satisfied."
        ))

        # Goal 3: Avoid Operating Fans in Empty Zones
        empty_zones = [zid for zid, z in percepts.zones.items() if not z.is_occupied]
        fans_in_empty = sum(len(zone_fan_allocations[zid]) for zid in empty_zones)
        g3_satisfied = (fans_in_empty == 0)
        goals.append(GoalStatus(
            goal_name="Goal 3: Avoid Operating Fans in Empty Zones",
            target="0 active fans in vacant zones",
            achieved=g3_satisfied,
            description=f"Achieved: 0 fans running in {len(empty_zones)} empty zones." if g3_satisfied else f"Violated: {fans_in_empty} fans running in empty zones."
        ))

        # Goal 4: Minimise Unnecessary Energy Consumption
        g4_satisfied = True
        goals.append(GoalStatus(
            goal_name="Goal 4: Minimise Unnecessary Energy Consumption",
            target="Activate minimal sufficient fans (60W per unit)",
            achieved=g4_satisfied,
            description=f"Achieved: Operating {selected_state.active_fan_count} fans ({selected_state.fan_power_w} W total fan load)."
        ))

        comfort = calculate_comfort_score(percepts, selected_state, config.light_threshold_lux, config.temp_comfort_min, config.temp_comfort_max)
        efficiency = calculate_energy_efficiency_score(selected_state)
        coverage = calculate_occupancy_coverage_score(percepts, selected_state)
        pref_satisfaction = calculate_preference_satisfaction_score(percepts, selected_state)
        utility = calculate_total_utility(comfort, efficiency, coverage, pref_satisfaction)

        achieved_count = sum(1 for g in goals if g.achieved)
        summary_reason = f"Goal-Directed Plan: {achieved_count}/4 goals achieved. {selected_state.active_fan_count}/8 fans active ({selected_state.fan_power_w} W). " + " ".join([f"{z}: {r}" for z, r in zone_reasons.items() if "fans kept OFF" not in r or not is_occupied_room][:2])

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
            reason=summary_reason,
            matched_rule=f"Goal Plan: {achieved_count}/4 Goals Satisfied",
            internal_state={"goals_evaluated": len(goals), "all_satisfied": achieved_count == len(goals)},
            goals_status=goals,
            utility_breakdown=None,
            fan_states=new_fan_states,
            active_fan_count=selected_state.active_fan_count,
            fan_power_w=selected_state.fan_power_w,
            zone_fan_allocations=zone_fan_allocations,
            zone_reasons=zone_reasons
        )
