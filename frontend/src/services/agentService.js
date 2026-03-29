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
  if (userId === undefined || userId === null || userId === "") {
    return null;
  }

  const normalized = String(userId).trim();
  return normalized || null;
}

async function resolveUserId(userId) {
  return normalizeUserId(userId) || (await getActiveUserId());
}

async function askAI(query, userId = null, userContext = null) {
  const resolvedUserId = await resolveUserId(userId);
  return request("/ask", {
    user_id: resolvedUserId,
    query,
    user_context: userContext,
  });
}

async function getFirePlan(userId = null, retirementAge) {
  const resolvedUserId = await resolveUserId(userId);
  return request("/feature/fire", {
    user_id: resolvedUserId,
    retirement_age: retirementAge ?? null,
  });
}

async function getCouplePlan(userId = null, useAI = false) {
  const resolvedUserId = await resolveUserId(userId);
  return request("/feature/couple", {
    user_id: resolvedUserId,
    use_ai: useAI,
  });
}

export default {
  askAI,
  getFirePlan,
  getCouplePlan,
};
