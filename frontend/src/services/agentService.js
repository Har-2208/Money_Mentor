import { getActiveUserId } from "./userIdentity";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(path, body, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed for ${path}.`;
    try {
      const errorData = await response.json();
      if (typeof errorData?.detail === "string") {
        message = errorData.detail;
      }
    } catch {
      // Keep generic message if payload is not JSON.
    }
    throw new Error(message);
  }

  return response.json();
}

function normalizeUserId(userId) {
  if (userId === undefined || userId === null) {
    return getActiveUserId();
  }
  const numericId = Number(userId);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : 1;
}

async function askAI(query, userId = null) {
  return request("/ask", {
    user_id: normalizeUserId(userId),
    query,
  });
}

async function getFirePlan(userId = null, retirementAge) {
  return request("/feature/fire", {
    user_id: normalizeUserId(userId),
    retirement_age: retirementAge ?? null,
  });
}

async function getTaxAnalysis(userId = null, salary, deductions) {
  return request("/feature/tax", {
    user_id: normalizeUserId(userId),
    salary: salary ?? null,
    deductions: deductions ?? null,
  });
}

async function getLifeEventPlan(userId = null, event) {
  return request("/feature/life-event", {
    user_id: normalizeUserId(userId),
    event,
  });
}

async function getCouplePlan(userId = null) {
  return request("/feature/couple", {
    user_id: normalizeUserId(userId),
  });
}

export default {
  askAI,
  getFirePlan,
  getTaxAnalysis,
  getLifeEventPlan,
  getCouplePlan,
};
