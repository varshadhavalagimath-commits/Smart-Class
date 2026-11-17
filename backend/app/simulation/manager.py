import asyncio
from typing import Dict, Optional, List, Any
from app.models.schemas import (
    ClassroomPercepts,
    DeviceState,
    AgentType,
    AgentDecision,
    SimulationConfig,
    SimulationState,
    ManualInputRequest,
    AgentCompareResponse,
    AgentComparisonItem
)
from app.models.database import insert_decision, init_db
from app.agents.base_agent import BaseAgent
from app.agents.simple_reflex import SimpleReflexAgent
from app.agents.model_based import ModelBasedAgent
from app.agents.goal_based import GoalBasedAgent
from app.agents.utility_based import UtilityBasedAgent
from app.simulation.environment import ClassroomEnvironment
from app.simulation.energy_engine import EnergyEngine


class SimulationManager:
    def __init__(self):
        init_db()
        self.config = SimulationConfig()
        self.environment = ClassroomEnvironment()
        self.energy_engine = EnergyEngine(cost_per_kwh=self.config.cost_per_kwh)

        self.agents: Dict[AgentType, BaseAgent] = {
            AgentType.SIMPLE_REFLEX: SimpleReflexAgent(),
            AgentType.MODEL_BASED: ModelBasedAgent(),
            AgentType.GOAL_BASED: GoalBasedAgent(),
            AgentType.UTILITY_BASED: UtilityBasedAgent(),
        }

        self.is_running: bool = False
        self.step_count: int = 0
        self.current_devices = DeviceState()
        self.last_decision: Optional[AgentDecision] = None
        self._loop_task: Optional[asyncio.Task] = None

        # Initialize with first step
        perceived = self.environment.read_sensors()
        agent = self.agents[self.config.active_agent]
        self.last_decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = self.last_decision.selected_state

    def get_state(self) -> SimulationState:
        return SimulationState(
            is_running=self.is_running,
            step_count=self.step_count,
            simulated_time=self.environment.ground_truth.simulated_time,
            schedule_phase=self.environment.current_phase_description() if self.config.mode == "automatic" else "Manual Control Mode",
            current_percepts=self.environment.current_perceived,
            raw_percepts=self.environment.ground_truth,
            active_agent=self.config.active_agent,
            current_devices=self.current_devices,
            last_decision=self.last_decision,
            metrics=self.energy_engine.metrics,
            config=self.config
        )

    def execute_step(self) -> SimulationState:
        """
        Executes one discrete simulation step.
        """
        self.step_count += 1

        if self.config.mode == "automatic":
            perceived, ground_truth = self.environment.step_schedule()
        else:
            perceived = self.environment.read_sensors()
            ground_truth = self.environment.ground_truth

        # Run active agent decision
        agent = self.agents[self.config.active_agent]
        decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = decision.selected_state
        self.last_decision = decision

        # Energy & Metrics recording
        step_metrics = self.energy_engine.record_step(
            step_number=self.step_count,
            simulated_time=ground_truth.simulated_time,
            devices=self.current_devices,
            students_count=perceived.students_count,
            temperature=perceived.temperature,
            light_intensity=perceived.light_intensity,
            comfort_score=decision.comfort_score,
            step_minutes=self.config.sim_minutes_per_step
        )

        zone_occ = {z: info.students_count for z, info in perceived.zones.items()}
        zone_prefs = {z: f"S:{info.student_preference},T:{info.teacher_preference}" for z, info in perceived.zones.items()}

        # Record in SQLite history
        insert_decision(
            simulated_time=ground_truth.simulated_time,
            students_count=perceived.students_count,
            temperature=perceived.temperature,
            light_intensity=perceived.light_intensity,
            activity=perceived.activity.value,
            door_status=perceived.door_status.value,
            window_status=perceived.window_status.value,
            agent_type=self.config.active_agent.value,
            lights=self.current_devices.lights,
            fans=self.current_devices.fans,
            projector=self.current_devices.projector,
            power_w=decision.power_w,
            baseline_power_w=step_metrics["baseline_power_w"],
            comfort_score=decision.comfort_score,
            energy_saved_step_wh=step_metrics["step_saved_wh"],
            reason=decision.reason,
            active_fan_count=self.current_devices.active_fan_count,
            fan_power_w=self.current_devices.fan_power_w,
            fan_states=self.current_devices.fan_states,
            zone_occupancy=zone_occ,
            zone_preferences=zone_prefs,
            mode=self.config.mode
        )

        return self.get_state()

    def apply_manual_input(self, req: ManualInputRequest) -> SimulationState:
        """
        Mode B: Manual Entry
        Updates the classroom environment directly, immediately triggers agent decision.
        Pauses automatic schedule ticker so user manual values remain stable.
        """
        self.config.mode = "manual"
        self.is_running = False  # Pause automatic ticker to prevent immediate overwrite!

        perceived, ground_truth = self.environment.set_manual_percepts(
            temperature=req.temperature,
            light_intensity=req.light_intensity,
            activity=req.activity,
            door_status=req.door_status,
            window_status=req.window_status,
            students_count=req.students_count,
            simulated_time=req.simulated_time,
            zone_occupancy=req.zone_occupancy,
            student_preferences=req.student_preferences,
            teacher_present_zone=req.teacher_present_zone,
            teacher_preference=req.teacher_preference,
            teacher_target_fan=req.teacher_target_fan,
            fan_availability=req.fan_availability,
            fan_manual_overrides=req.fan_manual_overrides,
            projector_override=req.projector_override
        )

        self.step_count += 1
        agent = self.agents[self.config.active_agent]
        decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = decision.selected_state
        self.last_decision = decision

        step_metrics = self.energy_engine.record_step(
            step_number=self.step_count,
            simulated_time=ground_truth.simulated_time,
            devices=self.current_devices,
            students_count=perceived.students_count,
            temperature=perceived.temperature,
            light_intensity=perceived.light_intensity,
            comfort_score=decision.comfort_score,
            step_minutes=self.config.sim_minutes_per_step
        )

        zone_occ = {z: info.students_count for z, info in perceived.zones.items()}
        zone_prefs = {z: f"S:{info.student_preference},T:{info.teacher_preference}" for z, info in perceived.zones.items()}

        insert_decision(
            simulated_time=ground_truth.simulated_time,
            students_count=perceived.students_count,
            temperature=perceived.temperature,
            light_intensity=perceived.light_intensity,
            activity=perceived.activity.value,
            door_status=perceived.door_status.value,
            window_status=perceived.window_status.value,
            agent_type=self.config.active_agent.value,
            lights=self.current_devices.lights,
            fans=self.current_devices.fans,
            projector=self.current_devices.projector,
            power_w=decision.power_w,
            baseline_power_w=step_metrics["baseline_power_w"],
            comfort_score=decision.comfort_score,
            energy_saved_step_wh=step_metrics["step_saved_wh"],
            reason=f"[Manual Override] {decision.reason}",
            active_fan_count=self.current_devices.active_fan_count,
            fan_power_w=self.current_devices.fan_power_w,
            fan_states=self.current_devices.fan_states,
            zone_occupancy=zone_occ,
            zone_preferences=zone_prefs,
            mode="manual"
        )

        return self.get_state()

    def set_projector_override(self, override: Optional[bool]) -> SimulationState:
        """
        Manually overrides the instructional projector to ON (True), OFF (False), or Reset to Auto (None).
        """
        self.environment.set_projector_override(override)
        perceived = self.environment.read_sensors()
        agent = self.agents[self.config.active_agent]
        decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = decision.selected_state
        self.last_decision = decision

        state_str = "Force ON (250W)" if override is True else ("Force OFF (Whiteboard 0W)" if override is False else "Reset to Auto")
        insert_decision(
            simulated_time=self.environment.ground_truth.simulated_time,
            students_count=perceived.students_count,
            temperature=perceived.temperature,
            light_intensity=perceived.light_intensity,
            activity=perceived.activity.value,
            door_status=perceived.door_status.value,
            window_status=perceived.window_status.value,
            agent_type=self.config.active_agent.value,
            lights=self.current_devices.lights,
            fans=self.current_devices.fans,
            projector=self.current_devices.projector,
            power_w=decision.power_w,
            baseline_power_w=self.energy_engine.metrics.baseline_power_w,
            comfort_score=decision.comfort_score,
            energy_saved_step_wh=0.0,
            reason=f"[Manual Projector Override] Projector set to {state_str}.",
            active_fan_count=self.current_devices.active_fan_count,
            fan_power_w=self.current_devices.fan_power_w,
            fan_states=self.current_devices.fan_states,
            zone_occupancy={z: info.students_count for z, info in perceived.zones.items()},
            zone_preferences={z: f"S:{info.student_preference},T:{info.teacher_preference}" for z, info in perceived.zones.items()},
            mode="manual"
        )
        return self.get_state()

    def set_fan_override(self, fan_id: int, override: Optional[bool]) -> SimulationState:
        """
        Manually overrides a specific fan to ON (True), OFF (False), or Reset to Auto (None).
        """
        self.environment.set_fan_override(fan_id, override)
        perceived = self.environment.read_sensors()
        agent = self.agents[self.config.active_agent]
        decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = decision.selected_state
        self.last_decision = decision

        # Log override event
        state_str = "Force ON" if override is True else ("Force OFF" if override is False else "Reset to Auto")
        insert_decision(
            simulated_time=self.environment.ground_truth.simulated_time,
            students_count=perceived.students_count,
            temperature=perceived.temperature,
            light_intensity=perceived.light_intensity,
            activity=perceived.activity.value,
            door_status=perceived.door_status.value,
            window_status=perceived.window_status.value,
            agent_type=self.config.active_agent.value,
            lights=self.current_devices.lights,
            fans=self.current_devices.fans,
            projector=self.current_devices.projector,
            power_w=decision.power_w,
            baseline_power_w=self.energy_engine.metrics.baseline_power_w,
            comfort_score=decision.comfort_score,
            energy_saved_step_wh=0.0,
            reason=f"[Manual Fan Override] Fan {fan_id} set to {state_str}.",
            active_fan_count=self.current_devices.active_fan_count,
            fan_power_w=self.current_devices.fan_power_w,
            fan_states=self.current_devices.fan_states,
            zone_occupancy={z: info.students_count for z, info in perceived.zones.items()},
            zone_preferences={z: f"S:{info.student_preference},T:{info.teacher_preference}" for z, info in perceived.zones.items()},
            mode="manual"
        )
        return self.get_state()

    def set_fan_availability(self, fan_id: int, is_available: bool) -> SimulationState:
        """
        Sets a fan as Available (True) or Faulty/Unavailable (False).
        """
        self.environment.set_fan_availability(fan_id, is_available)
        perceived = self.environment.read_sensors()
        agent = self.agents[self.config.active_agent]
        decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = decision.selected_state
        self.last_decision = decision
        return self.get_state()

    def reset_all_fan_overrides(self) -> SimulationState:
        """
        Resets all 8 fans to automatic agent control.
        """
        self.environment.reset_all_fan_overrides()
        perceived = self.environment.read_sensors()
        agent = self.agents[self.config.active_agent]
        decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = decision.selected_state
        self.last_decision = decision
        return self.get_state()

    def set_zone_preference(
        self,
        zone_id: str,
        student_preference: Optional[str] = None,
        teacher_preference: Optional[str] = None,
        teacher_target_fan: Optional[int] = None
    ) -> SimulationState:
        """
        Sets student and/or teacher preferences for a specific zone.
        """
        if zone_id in self.environment.ground_truth.zones:
            if student_preference is not None:
                self.environment.ground_truth.zones[zone_id].student_preference = student_preference
            if teacher_preference is not None:
                self.environment.ground_truth.zones[zone_id].teacher_preference = teacher_preference
                self.environment.ground_truth.teacher_preference = teacher_preference
            if teacher_target_fan is not None:
                self.environment.ground_truth.teacher_target_fan = teacher_target_fan

        self.environment.current_perceived = self.environment.read_sensors()
        perceived = self.environment.current_perceived
        agent = self.agents[self.config.active_agent]
        decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = decision.selected_state
        self.last_decision = decision
        return self.get_state()

    def compare_all_agents(self, custom_percepts: Optional[ClassroomPercepts] = None) -> AgentCompareResponse:
        """
        Runs all 4 independent agents against exactly the same input percepts.
        """
        percepts = custom_percepts if custom_percepts else self.environment.read_sensors()
        results: List[AgentComparisonItem] = []

        for agent_type in [
            AgentType.SIMPLE_REFLEX,
            AgentType.MODEL_BASED,
            AgentType.GOAL_BASED,
            AgentType.UTILITY_BASED
        ]:
            agent = self.agents[agent_type]
            decision = agent.decide(percepts, self.current_devices, self.config)

            # Build zone coverage summary
            zone_cov = {}
            for zid, fans_active in (decision.zone_fan_allocations or {}).items():
                if fans_active:
                    zone_cov[zid] = f"{len(fans_active)} Fan{'s' if len(fans_active)>1 else ''} ON ({', '.join(f'F{f}' for f in fans_active)})"
                else:
                    zone_cov[zid] = "Fans OFF"

            memory_info = decision.internal_state if agent_type == AgentType.MODEL_BASED else None
            goal_status_list = [f"{g.goal_name}: {'Satisfied' if g.achieved else 'Unsatisfied'}" for g in (decision.goals_status or [])] if agent_type == AgentType.GOAL_BASED else None

            results.append(AgentComparisonItem(
                agent_type=agent_type,
                agent_name=agent.agent_name,
                lights=decision.selected_state.lights,
                fans=decision.selected_state.fans,
                projector=decision.selected_state.projector,
                comfort_score=decision.comfort_score,
                power_w=decision.power_w,
                utility_score=decision.utility_score,
                reason=decision.reason,
                matched_detail=decision.matched_rule,
                fan_states=decision.fan_states,
                active_fan_count=decision.active_fan_count,
                fan_power_w=decision.fan_power_w,
                zone_coverage=zone_cov,
                memory_info=memory_info,
                goal_status_list=goal_status_list
            ))

        return AgentCompareResponse(percepts=percepts, comparisons=results)

    def set_active_agent(self, agent_type: AgentType) -> SimulationState:
        self.config.active_agent = agent_type
        perceived = self.environment.read_sensors()
        agent = self.agents[agent_type]
        self.last_decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = self.last_decision.selected_state
        return self.get_state()

    def reset(self) -> SimulationState:
        self.is_running = False
        self.step_count = 0
        self.config.mode = "automatic"
        self.environment.reset()
        self.energy_engine.reset()
        for agent in self.agents.values():
            if hasattr(agent, "reset_internal_state"):
                agent.reset_internal_state()

        perceived = self.environment.read_sensors()
        agent = self.agents[self.config.active_agent]
        self.current_devices = DeviceState()
        self.last_decision = agent.decide(perceived, self.current_devices, self.config)
        self.current_devices = self.last_decision.selected_state
        return self.get_state()

    def start(self):
        self.is_running = True

    def pause(self):
        self.is_running = False


# Singleton instance
sim_manager = SimulationManager()
