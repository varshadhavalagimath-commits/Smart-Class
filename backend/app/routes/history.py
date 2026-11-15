from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.models.schemas import AnalyticsResponse, HistoryItem
from app.models.database import get_history, clear_history
from app.simulation.manager import sim_manager

router = APIRouter(prefix="/api", tags=["analytics_and_history"])


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics():
    return sim_manager.energy_engine.get_analytics()


@router.get("/history", response_model=List[HistoryItem])
def get_decision_history(limit: int = Query(default=100, ge=1, le=500)):
    return get_history(limit=limit)


@router.delete("/history")
def delete_decision_history():
    clear_history()
    return {"status": "success", "message": "Decision history cleared successfully"}
