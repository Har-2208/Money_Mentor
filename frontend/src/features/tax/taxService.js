import axios from "axios";
import { getActiveUserId } from "../../services/userIdentity";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function calculateTax(formData) {
  try {
    const deductions = {
      "80C": Number(formData?.deductions_80C || 0),
      "80D": Number(formData?.deductions_80D || 0),
      other: Number(formData?.other_deductions || 0),
    };
    const response = await apiClient.post("/feature/tax", {
      user_id: getActiveUserId(),
      salary: Number(formData?.annual_salary || 0),
      deductions,
    });
    return response.data;
  } catch (error) {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.message ||
      "Failed to calculate tax.";
    throw new Error(message);
  }
}

export default {
  calculateTax,
};
