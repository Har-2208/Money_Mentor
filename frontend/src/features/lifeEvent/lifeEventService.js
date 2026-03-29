import axios from "axios";
import { getActiveUserId } from "../../services/userIdentity";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function getAdvice(selectedEvent, context = {}) {
  try {
    const userId = await getActiveUserId();
    const response = await apiClient.post("/feature/life-event", {
      user_id: userId,
      event: selectedEvent,
      annual_income: context?.annual_income ?? null,
      monthly_expenses: context?.monthly_expenses ?? null,
      bonus: context?.bonus ?? null,
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch life event advice.";
    throw new Error(message);
  }
}

export default {
  getAdvice,
};
