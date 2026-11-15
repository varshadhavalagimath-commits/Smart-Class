import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.simulation import router as sim_router
from app.routes.agents import router as agents_router
from app.routes.history import router as history_router
from app.simulation.manager import sim_manager


# Background task loop for continuous live automatic detection mode
async def simulation_background_loop():
    while True:
        try:
            if sim_manager.is_running and sim_manager.config.mode == "automatic":
                sim_manager.execute_step()
            interval = sim_manager.config.update_interval_sec
            await asyncio.sleep(interval)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[Simulation Loop Error] {e}")
            await asyncio.sleep(1.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch background simulation ticker
    loop_task = asyncio.create_task(simulation_background_loop())
    yield
    # Shutdown
    loop_task.cancel()
    try:
        await loop_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Smart Classroom Energy Management Agent API",
    description="Intelligent Rational Agents controlling classroom devices to minimize energy while maintaining comfort.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sim_router)
app.include_router(agents_router)
app.include_router(history_router)


@app.get("/")
def root():
    return {
        "title": "Smart Classroom Energy Management Agent API",
        "status": "online",
        "docs_url": "/docs",
        "endpoints": [
            "/api/simulation/state",
            "/api/simulation/start",
            "/api/simulation/pause",
            "/api/simulation/reset",
            "/api/simulation/step",
            "/api/simulation/manual",
            "/api/agents/decision",
            "/api/agents/compare",
            "/api/analytics",
            "/api/history"
        ]
    }
