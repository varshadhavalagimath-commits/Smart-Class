import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import SimulatorPage from './pages/SimulatorPage';
import AgentComparisonPage from './pages/AgentComparisonPage';
import EnergyAnalyticsPage from './pages/EnergyAnalyticsPage';
import DecisionHistoryPage from './pages/DecisionHistoryPage';
import { api } from './services/api';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const [simulationState, setSimulationState] = useState(null);
  const [backendError, setBackendError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const state = await api.getState();
      setSimulationState(state);
      setBackendError(null);
    } catch (err) {
      console.warn('Backend connection error:', err);
      setBackendError(err.message || 'Cannot connect to Python FastAPI backend at http://localhost:5000');
    }
  }, []);

  // Poll state every 1.5s when simulation is running
  useEffect(() => {
    refreshState();
    const interval = setInterval(() => {
      refreshState();
    }, 1500);
    return () => clearInterval(interval);
  }, [refreshState]);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const newState = await api.startSimulation();
      setSimulationState(newState);
    } catch (err) {
      alert('Failed to start simulation: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      const newState = await api.pauseSimulation();
      setSimulationState(newState);
    } catch (err) {
      alert('Failed to pause simulation: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      const newState = await api.resetSimulation();
      setSimulationState(newState);
    } catch (err) {
      alert('Failed to reset simulation: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep = async () => {
    setIsLoading(true);
    try {
      const newState = await api.stepSimulation();
      setSimulationState(newState);
    } catch (err) {
      alert('Failed to advance step: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyManual = async (manualData) => {
    setIsLoading(true);
    try {
      const newState = await api.applyManualInput(manualData);
      setSimulationState(newState);
      return newState;
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateConfig = async (configData) => {
    try {
      const newState = await api.updateConfig(configData);
      setSimulationState(newState);
    } catch (err) {
      alert('Failed to update config: ' + err.message);
    }
  };

  const handleSelectAgent = async (agentType) => {
    setIsLoading(true);
    try {
      const newState = await api.selectAgent(agentType);
      setSimulationState(newState);
    } catch (err) {
      alert('Failed to switch agent: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Router>
      <div className="app-container">
        {/* Left Navigation Sidebar */}
        <Sidebar
          isRunning={simulationState?.is_running ?? false}
          activeAgent={simulationState?.active_agent ?? 'utility_based'}
        />

        {/* Main Content Area */}
        <div className="main-content">
          <Navbar state={simulationState} />

          {/* Backend Connection Warning if not reachable */}
          {backendError && (
            <div style={{
              margin: '1.5rem 2rem 0',
              padding: '1rem 1.25rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#991b1b',
              fontSize: '0.86rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={20} color="#dc2626" />
                <div>
                  <strong>Backend Connection Error:</strong> {backendError}. Please ensure the Python FastAPI backend is running on port 5000 (`python backend/run.py`).
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={refreshState}
                style={{ backgroundColor: '#ffffff', borderColor: '#fca5a5', color: '#991b1b' }}
              >
                <RefreshCw size={14} />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Router Routes */}
          <Routes>
            <Route
              path="/"
              element={
                <DashboardPage
                  state={simulationState}
                  onSelectAgent={handleSelectAgent}
                />
              }
            />

            <Route
              path="/simulator"
              element={
                <SimulatorPage
                  state={simulationState}
                  onStart={handleStart}
                  onPause={handlePause}
                  onReset={handleReset}
                  onStep={handleStep}
                  onUpdateConfig={handleUpdateConfig}
                  onSelectAgent={handleSelectAgent}
                  onApplyManual={handleApplyManual}
                  onResetDefault={handleReset}
                  isLoading={isLoading}
                />
              }
            />

            <Route
              path="/compare"
              element={
                <AgentComparisonPage
                  state={simulationState}
                  onSelectAgent={handleSelectAgent}
                />
              }
            />

            <Route
              path="/analytics"
              element={
                <EnergyAnalyticsPage
                  state={simulationState}
                />
              }
            />

            <Route
              path="/history"
              element={
                <DecisionHistoryPage />
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
