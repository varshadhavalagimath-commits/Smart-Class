const BASE_URL = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    const errorText = await response.text();
    let detail = errorText;
    try {
      const errJson = JSON.parse(errorText);
      detail = errJson.detail || errorText;
    } catch (e) {
      // ignore
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  async getState() {
    const res = await fetch(`${BASE_URL}/simulation/state`);
    return handleResponse(res);
  },

  async startSimulation() {
    const res = await fetch(`${BASE_URL}/simulation/start`, { method: 'POST' });
    return handleResponse(res);
  },

  async pauseSimulation() {
    const res = await fetch(`${BASE_URL}/simulation/pause`, { method: 'POST' });
    return handleResponse(res);
  },

  async resetSimulation() {
    const res = await fetch(`${BASE_URL}/simulation/reset`, { method: 'POST' });
    return handleResponse(res);
  },

  async stepSimulation() {
    const res = await fetch(`${BASE_URL}/simulation/step`, { method: 'POST' });
    return handleResponse(res);
  },

  async applyManualInput(data) {
    const res = await fetch(`${BASE_URL}/simulation/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateConfig(config) {
    const res = await fetch(`${BASE_URL}/simulation/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse(res);
  },

  async setFanOverride(fanId, override) {
    const res = await fetch(`${BASE_URL}/simulation/fan/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fan_id: fanId, override }),
    });
    return handleResponse(res);
  },

  async setFanAvailability(fanId, isAvailable) {
    const res = await fetch(`${BASE_URL}/simulation/fan/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fan_id: fanId, is_available: isAvailable }),
    });
    return handleResponse(res);
  },

  async resetAllFanOverrides() {
    const res = await fetch(`${BASE_URL}/simulation/fan/reset_overrides`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async setZonePreference(zoneId, studentPreference, teacherPreference, teacherTargetFan = null) {
    const res = await fetch(`${BASE_URL}/simulation/zone/preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone_id: zoneId,
        student_preference: studentPreference,
        teacher_preference: teacherPreference,
        teacher_target_fan: teacherTargetFan,
      }),
    });
    return handleResponse(res);
  },

  async getDecision(agentType, percepts) {
    const res = await fetch(`${BASE_URL}/agents/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_type: agentType, percepts }),
    });
    return handleResponse(res);
  },

  async compareAgents(percepts = null) {
    const res = await fetch(`${BASE_URL}/agents/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(percepts),
    });
    return handleResponse(res);
  },

  async selectAgent(agentType) {
    const res = await fetch(`${BASE_URL}/agents/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_type: agentType }),
    });
    return handleResponse(res);
  },

  async getAnalytics() {
    const res = await fetch(`${BASE_URL}/analytics`);
    return handleResponse(res);
  },

  async getHistory(limit = 100) {
    const res = await fetch(`${BASE_URL}/history?limit=${limit}`);
    return handleResponse(res);
  },

  async clearHistory() {
    const res = await fetch(`${BASE_URL}/history`, { method: 'DELETE' });
    return handleResponse(res);
  },
};
