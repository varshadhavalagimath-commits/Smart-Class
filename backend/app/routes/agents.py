from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, Any
from app.models.schemas import (
    ClassroomPercepts,
    AgentDecision,
    AgentType,
    AgentCompareResponse,
    SimulationState
)
from app.simulation.manager import sim_manager

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.post("/decision", response_model=AgentDecision)
def get_agent_decision(
    agent_type: Optional[AgentType] = None,
    percepts: Optional[ClassroomPercepts] = None
):
    target_type = agent_type if agent_type else sim_manager.config.active_agent
    if target_type not in sim_manager.agents:
        raise HTTPException(status_code=400, detail=f"Unknown agent type: {target_type}")

    agent = sim_manager.agents[target_type]
    input_percepts = percepts if percepts else sim_manager.environment.read_sensors()
    return agent.decide(input_percepts, sim_manager.current_devices, sim_manager.config)


@router.post("/compare", response_model=AgentCompareResponse)
def compare_agents(percepts: Optional[ClassroomPercepts] = None):
    return sim_manager.compare_all_agents(percepts)


@router.post("/select", response_model=SimulationState)
def select_active_agent(payload: Dict[str, str]):
    agent_str = payload.get("agent_type")
    try:
        agent_type = AgentType(agent_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_str}")

    return sim_manager.set_active_agent(agent_type)
