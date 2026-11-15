from typing import Optional, Dict, Any, List
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


class ModelBasedAgent(BaseAgent):
    """
    Model-Based Agent:
    Maintains an internal model of how the classroom environment evolves,
    including history of past percepts, smoothed sensor values, and state confidence.
    Filters transient glitches (e.g. temporary 0-occupancy sensor dropout during lecture).
    """
    def __init__(self):
        super().__init__(AgentType.MODEL_BASED, "Model-Based Agent")
        self.previous_percepts: Optional[ClassroomPercepts] = None
        self.previous_device_state: Optional[DeviceState] = None
        self.consecutive_zero_occupancy: int = 0
        self.smoothed_temperature: Optional[float] = None
        self.smoothed_light: Optional[float] = None
        self.step_history: List[Dict[str, Any]] = []

    def reset_internal_state(self):
        self.previous_percepts = None
        self.previous_device_state = None
        self.consecutive_zero_occupancy = 0
        self.smoothed_temperature = None
        self.smoothed_light = None
        self.step_history.clear()

    def decide(
        self,
        percepts: ClassroomPercepts,
        current_devices: DeviceState,
        config: SimulationConfig
    ) -> AgentDecision:
        # 1. Update internal sensor smoothing (Exponential Moving Average)
        alpha = 0.65
        if self.smoothed_temperature is None:
            self.smoothed_temperature = percepts.temperature
        else:
            self.smoothed_temperature = round(
                alpha * percepts.temperature + (1 - alpha) * self.smoothed_temperature, 1
            )

        if self.smoothed_light is None:
            self.smoothed_light = percepts.light_intensity
        else:
            self.smoothed_light = round(
                alpha * percepts.light_intensity + (1 - alpha) * self.smoothed_light, 1
            )

        # 2. Determine occupancy confidence and glitch filtering
        raw_occupancy = percepts.students_count
        was_previously_occupied = (
            self.previous_percepts is not None and self.previous_percepts.students_count > 0
        )
        was_lecture_or_lab = (
            self.previous_percepts is not None and self.previous_percepts.activity in ["Lecture", "Lab"]
        )

        sensor_glitch_suspected = False
        confirmed_vacant = False

        if raw_occupancy == 0:
            self.consecutive_zero_occupancy += 1
            # If room was just holding an active lecture with many students, a sudden 0 reading
            # is treated as a probable momentary sensor fluctuation or line-of-sight occlusion
            if was_previously_occupied and was_lecture_or_lab and self.consecutive_zero_occupancy < 2:
                sensor_glitch_suspected = True
                confirmed_occupancy = True
                occupancy_status_desc = (
                    f"Sensor reads 0 students, but internal model retains occupancy state "
                    f"({self.previous_percepts.students_count} students in {self.previous_percepts.activity} previously). "
                    f"Awaiting confirmation (Streak: {self.consecutive_zero_occupancy}/2 readings)."
                )
            else:
                confirmed_vacant = True
                confirmed_occupancy = False
                occupancy_status_desc = (
                    f"Vacancy confirmed across {self.consecutive_zero_occupancy} consecutive reading(s)."
                )
        else:
            self.consecutive_zero_occupancy = 0
            confirmed_occupancy = True
            occupancy_status_desc = f"Occupancy verified: {raw_occupancy} students present."

        # 3. Model temperature trend & environmental dynamics
        temp_trend = "Stable"
        if self.previous_percepts is not None:
            delta_t = percepts.temperature - self.previous_percepts.temperature
            if delta_t > 0.4:
                temp_trend = f"Rising (+{delta_t:.1f}°C)"
            elif delta_t < -0.4:
                temp_trend = f"Falling ({delta_t:.1f}°C)"

        # 4. Formulate device decisions based on internal model
        new_lights = False
        new_fans = False
        new_projector = False
        decision_reasons = []

        if confirmed_vacant:
            new_lights = False
            new_fans = False
            new_projector = False
            decision_reasons.append("Model confirms classroom is vacant: all devices set to OFF.")
        else:
            # Lights decision: check smoothed lux and window status
            if self.smoothed_light < config.light_threshold_lux:
                new_lights = True
                decision_reasons.append(
                    f"Smoothed light ({self.smoothed_light:.0f} lux) is below target threshold ({config.light_threshold_lux:.0f} lux) -> Lights ON."
                )
            else:
                new_lights = False
                decision_reasons.append(
                    f"Smoothed natural light ({self.smoothed_light:.0f} lux) satisfies requirements -> Lights OFF."
                )

            # Fans decision: utilize hysteresis (26.0 threshold with 0.5°C hysteresis)
            cooling_needed = self.smoothed_temperature > config.temp_comfort_max
            # Proactive ventilation: if window is open and temperature is warm, keep air flowing
            if cooling_needed or (self.smoothed_temperature >= 25.0 and percepts.window_status.value == "Open" and percepts.door_status.value == "Closed"):
                new_fans = True
                decision_reasons.append(
                    f"Smoothed temp is {self.smoothed_temperature:.1f}°C (Trend: {temp_trend}) -> Fans ON for thermal regulation."
                )
            elif self.smoothed_temperature < config.temp_comfort_min:
                new_fans = False
                decision_reasons.append(
                    f"Smoothed temp ({self.smoothed_temperature:.1f}°C) is below comfort threshold -> Fans OFF."
                )
            else:
                new_fans = False
                decision_reasons.append(
                    f"Smoothed temp ({self.smoothed_temperature:.1f}°C) within neutral comfort zone -> Fans OFF."
                )

            # Projector decision: retain state during glitch; otherwise follow activity
            if sensor_glitch_suspected:
                # Maintain previous state to prevent presentation interruption
                new_projector = current_devices.projector
                decision_reasons.append(
                    "Potential sensor dropout: preserving projector state to avoid disrupting ongoing lecture."
                )
            else:
                if percepts.activity in ["Lecture", "Lab"]:
                    new_projector = True
                    decision_reasons.append(
                        f"Active instructional phase ({percepts.activity.value}) requires presentation media -> Projector ON."
                    )
                else:
                    new_projector = False
                    decision_reasons.append(
                        f"Phase ({percepts.activity.value}) requires no display media -> Projector OFF."
                    )

        selected_state = DeviceState(lights=new_lights, fans=new_fans, projector=new_projector)
        power_w = selected_state.power_watts(LIGHTS_POWER_W, FANS_POWER_W, PROJECTOR_POWER_W)
        comfort = calculate_comfort_score(percepts, selected_state, config.light_threshold_lux, config.temp_comfort_min, config.temp_comfort_max)
        efficiency = calculate_energy_efficiency_score(selected_state)
        compliance = calculate_operational_compliance_score(percepts, selected_state, config.light_threshold_lux)
        utility = calculate_total_utility(comfort, efficiency, compliance)

        # Build internal state snapshot for UI visualization
        internal_model_snapshot = {
            "internal_occupancy_belief": "Occupied" if confirmed_occupancy else "Vacant",
            "occupancy_streak_zeros": self.consecutive_zero_occupancy,
            "sensor_glitch_filtered": sensor_glitch_suspected,
            "smoothed_temperature_c": self.smoothed_temperature,
            "raw_temperature_c": percepts.temperature,
            "temperature_trend": temp_trend,
            "smoothed_lux": self.smoothed_light,
            "raw_lux": percepts.light_intensity,
            "previous_students": self.previous_percepts.students_count if self.previous_percepts else None,
            "previous_activity": self.previous_percepts.activity.value if self.previous_percepts else None,
            "status_notes": occupancy_status_desc
        }

        # Update previous state
        self.previous_percepts = percepts.model_copy()
        self.previous_device_state = selected_state.model_copy()

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
            reason=" ".join(decision_reasons),
            matched_rule=f"Internal State Model: {occupancy_status_desc} | Temp Trend: {temp_trend}",
            internal_state=internal_model_snapshot,
            goals_status=None,
            utility_breakdown=None
        )
