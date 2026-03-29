import axios from "axios";
import { getActiveUserId } from "../../services/userIdentity";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function generatePlan(formData) {
  try {
    const userId = await getActiveUserId();
    const response = await apiClient.post("/feature/couple", {
      user_id: userId,
      partner1_income: formData?.partner1_income ?? null,
      partner1_expenses: formData?.partner1_expenses ?? null,
      partner1_investments: formData?.partner1_investments ?? null,
      partner2_income: formData?.partner2_income ?? null,
      partner2_expenses: formData?.partner2_expenses ?? null,
      partner2_investments: formData?.partner2_investments ?? null,
      shared_goals: formData?.shared_goals ?? null,
      risk_preference: formData?.risk_preference ?? null,
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to generate couple plan.";
    throw new Error(message);
  }
}

async function importPartnerProfile(email) {
  try {
    const response = await apiClient.post("/feature/couple/import-profile", {
      email,
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to import partner profile.";
    throw new Error(message);
  }
}

export default {
  generatePlan,
  importPartnerProfile,
};
