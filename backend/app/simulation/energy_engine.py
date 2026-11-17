from typing import Dict, List, Any
from app.models.schemas import (
    DeviceState,
    SimulationMetrics,
    AnalyticsDataPoint,
    AnalyticsResponse,
    LIGHTS_POWER_W,
    PROJECTOR_POWER_W,
    FAN_POWER_PER_UNIT_W,
    TOTAL_FAN_COUNT,
    MAX_FAN_POWER_W,
    MAX_TOTAL_POWER_W
)

# Unmanaged baseline: conventional classrooms leave all 8 fans and equipment ON during school day
BASELINE_POWER_OCCUPIED_W = MAX_TOTAL_POWER_W  # 400W Lights + 250W Projector + 480W (8 fans x 60W) = 1130 W
BASELINE_POWER_VACANT_W = 640.0                # 400W Lights + 240W (4 fans left on accidentally) = 640 W
DEFAULT_COST_PER_KWH = 0.15                    # $0.15 per kWh


class EnergyEngine:
    def __init__(self, cost_per_kwh: float = DEFAULT_COST_PER_KWH):
        self.metrics = SimulationMetrics()
        self.history_points: List[AnalyticsDataPoint] = []
        self.total_comfort_accumulated: float = 0.0
        self.cost_per_kwh = cost_per_kwh

    def reset(self):
        self.metrics = SimulationMetrics()
        self.history_points.clear()
        self.total_comfort_accumulated = 0.0

    def record_step(
        self,
        step_number: int,
        simulated_time: str,
        devices: DeviceState,
        students_count: int,
        temperature: float,
        light_intensity: float,
        comfort_score: float,
        step_minutes: int = 15
    ) -> Dict[str, float]:
        """
        Calculates power and updates cumulative energy (kWh) and device runtimes.
        Dynamic fan power: active_fans * 60W.
        """
        step_hours = step_minutes / 60.0

        # Agent power and energy
        agent_power_w = devices.power_watts()
        agent_step_kwh = (agent_power_w * step_hours) / 1000.0

        # Baseline power and energy
        baseline_power_w = BASELINE_POWER_OCCUPIED_W if students_count > 0 else BASELINE_POWER_VACANT_W
        baseline_step_kwh = (baseline_power_w * step_hours) / 1000.0

        # Savings for this step
        step_saved_kwh = max(0.0, baseline_step_kwh - agent_step_kwh)
        step_saved_wh = step_saved_kwh * 1000.0

        # Accumulate metrics
        self.metrics.total_steps += 1
        self.metrics.total_energy_kwh = round(self.metrics.total_energy_kwh + agent_step_kwh, 4)
        self.metrics.baseline_energy_kwh = round(self.metrics.baseline_energy_kwh + baseline_step_kwh, 4)
        self.metrics.energy_saved_kwh = round(self.metrics.energy_saved_kwh + step_saved_kwh, 4)

        if self.metrics.baseline_energy_kwh > 0:
            self.metrics.savings_percentage = round(
                (self.metrics.energy_saved_kwh / self.metrics.baseline_energy_kwh) * 100.0, 1
            )
        else:
            self.metrics.savings_percentage = 0.0

        self.metrics.current_power_w = agent_power_w
        self.metrics.baseline_power_w = baseline_power_w
        self.metrics.active_fan_count = devices.active_fan_count
        self.metrics.fan_power_w = round(devices.active_fan_count * FAN_POWER_PER_UNIT_W, 1)
        self.metrics.estimated_cost_saved = round(self.metrics.energy_saved_kwh * self.cost_per_kwh, 2)

        # Device runtime tracking
        if devices.lights:
            self.metrics.device_runtime_minutes["lights"] += step_minutes
        if devices.fans:
            self.metrics.device_runtime_minutes["fans"] += step_minutes
        if devices.projector:
            self.metrics.device_runtime_minutes["projector"] += step_minutes

        # Average comfort
        self.total_comfort_accumulated += comfort_score
        self.metrics.average_comfort = round(
            self.total_comfort_accumulated / self.metrics.total_steps, 1
        )

        # Record time series data point
        data_point = AnalyticsDataPoint(
            step=step_number,
            simulated_time=simulated_time,
            agent_power_w=round(agent_power_w, 1),
            baseline_power_w=round(baseline_power_w, 1),
            comfort_score=round(comfort_score, 1),
            cumulative_energy_kwh=self.metrics.total_energy_kwh,
            cumulative_savings_kwh=self.metrics.energy_saved_kwh,
            temperature=round(temperature, 1),
            lux=round(light_intensity, 1),
            students=students_count,
            active_fan_count=devices.active_fan_count,
            fan_power_w=self.metrics.fan_power_w
        )
        self.history_points.append(data_point)
        # Keep maximum 100 historical points for charts
        if len(self.history_points) > 100:
            self.history_points.pop(0)

        return {
            "agent_power_w": agent_power_w,
            "baseline_power_w": baseline_power_w,
            "agent_step_kwh": agent_step_kwh,
            "baseline_step_kwh": baseline_step_kwh,
            "step_saved_wh": step_saved_wh,
            "active_fan_count": devices.active_fan_count,
            "fan_power_w": self.metrics.fan_power_w
        }

    def get_analytics(self) -> AnalyticsResponse:
        cost_spent = round(self.metrics.total_energy_kwh * self.cost_per_kwh, 2)
        cost_saved = round(self.metrics.energy_saved_kwh * self.cost_per_kwh, 2)
        return AnalyticsResponse(
            total_energy_kwh=self.metrics.total_energy_kwh,
            baseline_energy_kwh=self.metrics.baseline_energy_kwh,
            energy_saved_kwh=self.metrics.energy_saved_kwh,
            savings_percentage=self.metrics.savings_percentage,
            current_power_w=self.metrics.current_power_w,
            baseline_power_w=self.metrics.baseline_power_w,
            average_comfort=self.metrics.average_comfort,
            active_fan_count=self.metrics.active_fan_count,
            fan_power_w=self.metrics.fan_power_w,
            estimated_cost_spent=cost_spent,
            estimated_cost_saved=cost_saved,
            device_runtime_minutes=self.metrics.device_runtime_minutes,
            history_points=self.history_points
        )
