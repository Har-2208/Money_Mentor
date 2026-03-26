const API_BASE_URL =
	import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

function normalizeFirePayload(formData = {}) {
	const fallbackRetirementAge =
		Number(formData.retirement_age) > 0 ? Number(formData.retirement_age) : null;

	return {
		user_id: 1,
		retirement_age: fallbackRetirementAge,
	};
}

async function generateFirePlan(formData) {
	const payload = normalizeFirePayload(formData);

	const response = await fetch(`${API_BASE_URL}/feature/fire`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		let message = "Failed to generate FIRE plan.";
		try {
			const errorData = await response.json();
			if (typeof errorData?.detail === "string") {
				message = errorData.detail;
			}
		} catch {
			// Ignore JSON parsing failures and keep fallback message.
		}
		throw new Error(message);
	}

	return response.json();
}

export default {
	generateFirePlan,
};
