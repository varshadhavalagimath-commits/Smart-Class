from typing import List, Tuple
from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentDecision,
    AgentType,
    SimulationConfig,
    UtilityCombinationEvaluation
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


class UtilityBasedAgent(BaseAgent):
    """
    Utility-Based Agent (Primary Architecture):
    Evaluates all 8 possible device actuation states (2^3 combinations: Lights x Fans x Projector).
    Computes real objective functions:
      U = 0.45 * Comfort + 0.40 * Energy Efficiency + 0.15 * Operational Compliance
    Enforces mandatory operational constraints:
      - Vacant room -> devices MUST be OFF
      - Sufficient lighting during active sessions
      - No unnecessary fan cooling when comfortable
      - Projector aligned with Lecture/Lab instructional requirements
    Applies tie-breaking preference toward the lower-energy state.
    """
    def __init__(self):
        super().__init__(AgentType.UTILITY_BASED, "Utility-Based Rational Agent")

    def decide(
        self,
        percepts: ClassroomPercepts,
        current_devices: DeviceState,
        config: SimulationConfig
    ) -> AgentDecision:
        evaluations: List[UtilityCombinationEvaluation] = []
        is_vacant = percepts.students_count == 0

        # Enumerate all 8 candidate action states
        candidate_combinations = [
            (False, False, False),
            (False, False, True),
            (False, True, False),
            (False, True, True),
            (True, False, False),
            (True, False, True),
            (True, True, False),
            (True, True, True),
        ]

        for lights, fans, proj in candidate_combinations:
            candidate_state = DeviceState(lights=lights, fans=fans, projector=proj)
            power_w = candidate_state.power_watts(LIGHTS_POWER_W, FANS_POWER_W, PROJECTOR_POWER_W)

            comfort = calculate_comfort_score(
                percepts,
                candidate_state,
                config.light_threshold_lux,
                config.temp_comfort_min,
                config.temp_comfort_max
            )
            efficiency = calculate_energy_efficiency_score(candidate_state)
            compliance = calculate_operational_compliance_score(
                percepts,
                candidate_state,
                config.light_threshold_lux
            )

            # Mandatory operational rules enforcement:
            # Rule 1: Vacancy constraint: devices MUST be OFF
            if is_vacant:
                if lights or fans or proj:
                    compliance = 0.0  # Mandatory violation: running devices when room is vacant
            else:
                # Rule 2: Active class illumination constraint (mandatory minimum lighting)
                effective_lux = percepts.light_intensity + (320.0 if lights else 0.0)
                if effective_lux < config.light_threshold_lux:
                    comfort = min(comfort, 20.0)
                    compliance = min(compliance, 20.0)  # Inadequate light violates operational standards

                # Rule 3: Active Lecture/Lab requires projector for instructional delivery
                if percepts.activity in ["Lecture", "Lab"]:
                    if not proj:
                        compliance = min(compliance, 25.0)  # Mandatory instructional tool missing
                elif percepts.activity in ["Break", "No class"]:
                    if proj:
                        compliance = min(compliance, 40.0)  # Wasteful media during recess

                # Rule 4: Do not run fans when comfortable
                if percepts.temperature <= config.temp_comfort_max and fans:
                    compliance = min(compliance, 65.0)

                # Rule 5: Active class in warm/hot temperature requires cooling (mandatory thermal management)
                if percepts.temperature > config.temp_comfort_max and not fans:
                    comfort = min(comfort, 30.0)
                    compliance = min(compliance, 25.0)  # Mandatory cooling omitted during excessive heat

            total_u = calculate_total_utility(
                comfort=comfort,
                efficiency=efficiency,
                compliance=compliance,
                w_comfort=0.45,
                w_energy=0.40,
                w_compliance=0.15
            )

            evaluations.append(UtilityCombinationEvaluation(
                lights=lights,
                fans=fans,
                projector=proj,
                power_w=power_w,
                comfort_score=comfort,
                energy_score=efficiency,
                compliance_score=compliance,
                utility_score=total_u,
                is_chosen=False
            ))

        # Select highest utility. Tie-breaker: if delta < 0.5, choose lower power_w
        best_eval = evaluations[0]
        for candidate in evaluations[1:]:
            delta = candidate.utility_score - best_eval.utility_score
            if delta > 0.5:
                best_eval = candidate
            elif abs(delta) <= 0.5:
                # Tie or near-tie: prefer lower energy consumption
                if candidate.power_w < best_eval.power_w:
                    best_eval = candidate

        # Mark chosen
        best_eval.is_chosen = True

        selected_state = DeviceState(
            lights=best_eval.lights,
            fans=best_eval.fans,
            projector=best_eval.projector
        )

        # Build comprehensive rational explanation
        state_str = f"Lights={'ON' if best_eval.lights else 'OFF'}, Fans={'ON' if best_eval.fans else 'OFF'}, Projector={'ON' if best_eval.projector else 'OFF'}"
        if is_vacant:
            explanation = (
                f"Classroom vacant (0 students). Selected state ({state_str}) yields highest utility "
                f"(U={best_eval.utility_score:.1f}) by eliminating all unneeded power (0 W), achieving 100% efficiency."
            )
        else:
            explanation = (
                f"Evaluated all 8 device combinations. Optimal policy ({state_str}) maximizes expected utility "
                f"(U={best_eval.utility_score:.1f}: Comfort={best_eval.comfort_score:.0f}, "
                f"Efficiency={best_eval.energy_score:.0f}, Compliance={best_eval.compliance_score:.0f}) "
                f"drawing {best_eval.power_w:.0f} W."
            )

        return AgentDecision(
            agent_type=self.agent_type,
            agent_name=self.agent_name,
            previous_state=current_devices,
            selected_state=selected_state,
            power_w=best_eval.power_w,
            comfort_score=best_eval.comfort_score,
            energy_efficiency_score=best_eval.energy_score,
            operational_compliance_score=best_eval.compliance_score,
            utility_score=best_eval.utility_score,
            reason=explanation,
            matched_rule=f"Optimal Utility: U = 0.45×{best_eval.comfort_score:.0f} + 0.40×{best_eval.energy_score:.0f} + 0.15×{best_eval.compliance_score:.0f} = {best_eval.utility_score:.2f}",
            internal_state={
                "candidate_count": len(evaluations),
                "weights": {"comfort": 0.45, "efficiency": 0.40, "compliance": 0.15},
                "chosen_power_w": best_eval.power_w
            },
            goals_status=None,
            utility_breakdown=evaluations
        )
