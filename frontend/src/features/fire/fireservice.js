import axios from "axios";
import { getActiveUserId } from "../../services/userIdentity";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function generateFirePlan(formData) {
  try {
    const userId = await getActiveUserId();
    const response = await apiClient.post("/feature/fire", {
      user_id: userId,
      retirement_age: formData?.retirement_age ?? null,
      current_age: formData?.current_age ?? null,
      monthly_income: formData?.monthly_income ?? null,
      monthly_expenses: formData?.monthly_expenses ?? null,
      current_investments: formData?.current_investments ?? null,
      risk_level: formData?.risk_level ?? null,
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to generate FIRE plan.";
    throw new Error(message);
  }
}

export default {
  generateFirePlan,
};
