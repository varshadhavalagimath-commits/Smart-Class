from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentDecision,
    AgentType,
    SimulationConfig
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


class SimpleReflexAgent(BaseAgent):
    """
    Simple Reflex Agent:
    Acts directly on current sensor percepts using fixed Condition-Action rules.
    It does not store history or evaluate future states.
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
        new_lights = False
        new_fans = False
        new_projector = False

        if percepts.students_count == 0:
            new_lights = False
            new_fans = False
            new_projector = False
            rules_triggered.append(
                f"[Rule R-1] IF occupancy == 0 THEN lights=OFF, fans=OFF, projector=OFF (Vacant room conservation)"
            )
            reason = "Classroom is vacant (0 students). Immediate reflex action turns OFF all devices to eliminate idle energy waste."
        else:
            # Rule for Lights
            if percepts.light_intensity < config.light_threshold_lux:
                new_lights = True
                rules_triggered.append(
                    f"[Rule R-2] IF occupants > 0 AND lux ({percepts.light_intensity:.0f}) < threshold ({config.light_threshold_lux:.0f}) THEN lights=ON"
                )
            else:
                new_lights = False
                rules_triggered.append(
                    f"[Rule R-3] IF occupants > 0 AND lux ({percepts.light_intensity:.0f}) >= threshold ({config.light_threshold_lux:.0f}) THEN lights=OFF (Adequate natural daylight)"
                )

            # Rule for Fans
            if percepts.temperature > config.temp_comfort_max:
                new_fans = True
                rules_triggered.append(
                    f"[Rule R-4] IF temp ({percepts.temperature:.1f}°C) > max comfort ({config.temp_comfort_max:.1f}°C) THEN fans=ON"
                )
            elif percepts.temperature < config.temp_comfort_min:
                new_fans = False
                rules_triggered.append(
                    f"[Rule R-5] IF temp ({percepts.temperature:.1f}°C) < min comfort ({config.temp_comfort_min:.1f}°C) THEN fans=OFF (Avoid chilling)"
                )
            else:
                new_fans = False
                rules_triggered.append(
                    f"[Rule R-6] IF temp ({percepts.temperature:.1f}°C) in comfort range ({config.temp_comfort_min}-{config.temp_comfort_max}°C) THEN fans=OFF (Cooling unneeded)"
                )

            # Rule for Projector
            if percepts.activity in ["Lecture", "Lab"]:
                new_projector = True
                rules_triggered.append(
                    f"[Rule R-7] IF activity == '{percepts.activity}' THEN projector=ON (Instructional media needed)"
                )
            else:
                new_projector = False
                rules_triggered.append(
                    f"[Rule R-8] IF activity == '{percepts.activity}' THEN projector=OFF (No presentation required)"
                )

            reason = " | ".join(rules_triggered)

        selected_state = DeviceState(lights=new_lights, fans=new_fans, projector=new_projector)
        power_w = selected_state.power_watts(LIGHTS_POWER_W, FANS_POWER_W, PROJECTOR_POWER_W)
        comfort = calculate_comfort_score(percepts, selected_state, config.light_threshold_lux, config.temp_comfort_min, config.temp_comfort_max)
        efficiency = calculate_energy_efficiency_score(selected_state)
        compliance = calculate_operational_compliance_score(percepts, selected_state, config.light_threshold_lux)
        utility = calculate_total_utility(comfort, efficiency, compliance)

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
            reason=reason,
            matched_rule="\n".join(rules_triggered),
            internal_state={"architecture": "Condition-Action Table", "rules_fired": len(rules_triggered)},
            goals_status=None,
            utility_breakdown=None
        )
