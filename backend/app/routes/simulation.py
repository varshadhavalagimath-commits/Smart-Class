from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.models.schemas import (
    SimulationState,
    ManualInputRequest,
    SimulationConfig,
    ProjectorOverrideRequest,
    FanOverrideRequest,
    FanAvailabilityRequest,
    ZonePreferenceRequest
)
from app.simulation.manager import sim_manager

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.get("/state", response_model=SimulationState)
def get_simulation_state():
    return sim_manager.get_state()


@router.post("/start", response_model=SimulationState)
def start_simulation():
    sim_manager.config.mode = "automatic"
    sim_manager.start()
    return sim_manager.get_state()


@router.post("/pause", response_model=SimulationState)
def pause_simulation():
    sim_manager.pause()
    return sim_manager.get_state()


@router.post("/reset", response_model=SimulationState)
def reset_simulation():
    return sim_manager.reset()


@router.post("/step", response_model=SimulationState)
def step_simulation():
    return sim_manager.execute_step()


@router.post("/manual", response_model=SimulationState)
def manual_simulation_override(req: ManualInputRequest):
    try:
        return sim_manager.apply_manual_input(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/projector/override", response_model=SimulationState)
def set_projector_manual_override(req: ProjectorOverrideRequest):
    try:
        return sim_manager.set_projector_override(req.override)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/fan/override", response_model=SimulationState)
def set_fan_manual_override(req: FanOverrideRequest):
    try:
        return sim_manager.set_fan_override(req.fan_id, req.override)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/fan/availability", response_model=SimulationState)
def set_fan_availability(req: FanAvailabilityRequest):
    try:
        return sim_manager.set_fan_availability(req.fan_id, req.is_available)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/fan/reset_overrides", response_model=SimulationState)
def reset_all_fan_overrides():
    return sim_manager.reset_all_fan_overrides()


@router.post("/zone/preference", response_model=SimulationState)
def set_zone_preference(req: ZonePreferenceRequest):
    try:
        return sim_manager.set_zone_preference(
            zone_id=req.zone_id,
            student_preference=req.student_preference,
            teacher_preference=req.teacher_preference,
            teacher_target_fan=req.teacher_target_fan
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/config", response_model=SimulationState)
def update_config(config_data: Dict[str, Any]):
    if "update_interval_sec" in config_data:
        sim_manager.config.update_interval_sec = max(0.5, min(10.0, float(config_data["update_interval_sec"])))
    if "noise_enabled" in config_data:
        sim_manager.config.noise_enabled = bool(config_data["noise_enabled"])
        sim_manager.environment.noise_enabled = sim_manager.config.noise_enabled
    if "light_threshold_lux" in config_data:
        sim_manager.config.light_threshold_lux = float(config_data["light_threshold_lux"])
    if "temp_comfort_min" in config_data:
        sim_manager.config.temp_comfort_min = float(config_data["temp_comfort_min"])
    if "temp_comfort_max" in config_data:
        sim_manager.config.temp_comfort_max = float(config_data["temp_comfort_max"])
    if "fan_activation_temp" in config_data:
        sim_manager.config.fan_activation_temp = float(config_data["fan_activation_temp"])
    if "cost_per_kwh" in config_data:
        sim_manager.config.cost_per_kwh = float(config_data["cost_per_kwh"])
        sim_manager.energy_engine.cost_per_kwh = sim_manager.config.cost_per_kwh
    return sim_manager.get_state()
