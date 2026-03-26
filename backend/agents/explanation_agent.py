from backend.services.gemini_services import ask_gemini


def explain_response(data: dict) -> str:
    prompt = f"""
    Explain this financial output in simple human language.

    Data:
    {data}

    Keep the response concise, actionable, and easy for a non-finance user.
    """
    return ask_gemini(prompt)