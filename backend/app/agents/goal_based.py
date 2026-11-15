from typing import List, Dict, Any
from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentDecision,
    AgentType,
    SimulationConfig,
    GoalStatus
)
from app.agents.base_agent import (
    BaseAgent,
    calculate_comfort_score,
    calculate_energy_efficiency_score,
    calculate_operational_compliance_score,
    calculate_total_utility,
    LIGHTS_POWER_W,
    FANS_POWER_W,
    PROJECTOR_POWER_W
)


class GoalBasedAgent(BaseAgent):
    """
    Goal-Based Agent:
    Acts intentionally by formulating goals and choosing actions that lead to a world
    state satisfying all desired operational and environmental goals:
    - Goal 1: Maintain Sufficient Illumination (>= 300 lux for occupants).
    - Goal 2: Maintain Thermal Comfort (22°C - 26°C range).
    - Goal 3: Eliminate Idle Energy Consumption (zero unneeded power).
    - Goal 4: Ensure Instructional Media Availability (Lecture/Lab media).
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
        is_occupied = percepts.students_count > 0

        # Goal 1: Visual Illumination
        if not is_occupied:
            g1_target = "Zero artificial light needed in vacant room"
            lights_action = False
            g1_achieved = True
            g1_desc = "Goal satisfied: No students present; artificial lighting switched off to conserve energy."
        else:
            g1_target = f"Illumination >= {config.light_threshold_lux:.0f} lux"
            if percepts.light_intensity < config.light_threshold_lux:
                lights_action = True
                g1_achieved = True
                g1_desc = f"Goal satisfied by action: Ambient {percepts.light_intensity:.0f} lux is below target; Lights ON to achieve reading standard."
            else:
                lights_action = False
                g1_achieved = True
                g1_desc = f"Goal satisfied naturally: Daylight {percepts.light_intensity:.0f} lux exceeds threshold; Lights kept OFF."

        goals.append(GoalStatus(
            goal_name="Goal 1: Maintain Sufficient Lighting",
            target=g1_target,
            achieved=g1_achieved,
            description=g1_desc
        ))

        # Goal 2: Thermal Comfort
        if not is_occupied:
            g2_target = "Fans OFF in vacant space"
            fans_action = False
            g2_achieved = True
            g2_desc = "Goal satisfied: Unoccupied space requires no active cooling."
        else:
            g2_target = f"Maintain comfort band {config.temp_comfort_min:.0f}°C - {config.temp_comfort_max:.0f}°C"
            if percepts.temperature > config.temp_comfort_max:
                fans_action = True
                g2_achieved = True
                g2_desc = f"Goal achieved by action: Temp {percepts.temperature:.1f}°C > {config.temp_comfort_max:.0f}°C; Fans activated to mitigate thermal discomfort."
            elif percepts.temperature < config.temp_comfort_min:
                fans_action = False
                g2_achieved = True
                g2_desc = f"Goal achieved: Temp {percepts.temperature:.1f}°C < {config.temp_comfort_min:.0f}°C; Fans kept OFF to prevent chill."
            else:
                fans_action = False
                g2_achieved = True
                g2_desc = f"Goal satisfied naturally: Room temp {percepts.temperature:.1f}°C is within target zone; Fans OFF."

        goals.append(GoalStatus(
            goal_name="Goal 2: Maintain Thermal Comfort",
            target=g2_target,
            achieved=g2_achieved,
            description=g2_desc
        ))

        # Goal 3: Instructional Media Readiness
        if not is_occupied:
            g3_target = "Projector OFF when vacant"
            projector_action = False
            g3_achieved = True
            g3_desc = "Goal satisfied: Projector powered down in empty room."
        else:
            if percepts.activity in ["Lecture", "Lab"]:
                g3_target = f"Projector ON for {percepts.activity.value}"
                projector_action = True
                g3_achieved = True
                g3_desc = f"Goal achieved: Projector energized to support pedagogical visual requirements."
            else:
                g3_target = f"Projector OFF for {percepts.activity.value}"
                projector_action = False
                g3_achieved = True
                g3_desc = f"Goal achieved: Session phase is {percepts.activity.value}; media projector turned OFF."

        goals.append(GoalStatus(
            goal_name="Goal 3: Equip Instructional Media",
            target=g3_target,
            achieved=g3_achieved,
            description=g3_desc
        ))

        # Goal 4: Energy Conservation (Supervisory Goal)
        unnecessary_devices_count = 0
        if not is_occupied:
            if lights_action or fans_action or projector_action:
                unnecessary_devices_count += 1
        g4_achieved = unnecessary_devices_count == 0
        goals.append(GoalStatus(
            goal_name="Goal 4: Eliminate Wasteful Energy Consumption",
            target="0 unneeded active devices",
            achieved=g4_achieved,
            description="Goal satisfied: All device actuations correspond strictly to validated occupancy and environmental targets."
        ))

        selected_state = DeviceState(lights=lights_action, fans=fans_action, projector=projector_action)
        power_w = selected_state.power_watts(LIGHTS_POWER_W, FANS_POWER_W, PROJECTOR_POWER_W)
        comfort = calculate_comfort_score(percepts, selected_state, config.light_threshold_lux, config.temp_comfort_min, config.temp_comfort_max)
        efficiency = calculate_energy_efficiency_score(selected_state)
        compliance = calculate_operational_compliance_score(percepts, selected_state, config.light_threshold_lux)
        utility = calculate_total_utility(comfort, efficiency, compliance)

        achieved_count = sum(1 for g in goals if g.achieved)
        summary_reason = f"Goal-directed action selected: {achieved_count}/4 operational goals satisfied. " + " ".join([g.description for g in goals[:3]])

        return AgentDecision(
            agent_type=self.agent_type,
            agent_name=self.agent_name,
            previous_state=current_devices,
            selected_state=selected_state,
            power_w=power_w,
            comfort_score=comfort,
            energy_efficiency_score=efficiency,
            operational_compliance_score=compliance,
            utility_score=utility,
            reason=summary_reason,
            matched_rule=f"Goal Plan: {achieved_count}/4 Goals Satisfied",
            internal_state={"goals_evaluated": len(goals), "all_satisfied": achieved_count == len(goals)},
            goals_status=goals,
            utility_breakdown=None
        )
