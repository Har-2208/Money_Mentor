import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

async function getAdvice(selectedEvent) {
  try {
    const response = await apiClient.post("/api/life-event-advice", {
      event: selectedEvent,
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
