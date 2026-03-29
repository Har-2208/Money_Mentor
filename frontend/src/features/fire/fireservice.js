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
      monthly_investment: formData?.monthly_investment ?? null,
      risk_level: formData?.risk_level ?? null,
      inflation_rate:
        formData?.inflation_rate !== undefined && formData?.inflation_rate !== null
          ? Number(formData.inflation_rate) / 100
          : null,
      annual_return:
        formData?.annual_return !== undefined && formData?.annual_return !== null
          ? Number(formData.annual_return) / 100
          : null,
      safe_withdrawal_rate:
        formData?.safe_withdrawal_rate !== undefined && formData?.safe_withdrawal_rate !== null
          ? Number(formData.safe_withdrawal_rate) / 100
          : null,
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

async function getLatestFirePlan() {
  try {
    const userId = await getActiveUserId();
    const response = await apiClient.get("/feature/fire/latest", {
      params: { user_id: userId },
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch latest FIRE plan.";
    throw new Error(message);
  }
}

export default {
  generateFirePlan,
  getLatestFirePlan,
};
