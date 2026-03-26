import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")

if GEMINI_API_KEY:
    _client = genai.Client(api_key=GEMINI_API_KEY)
else:
    _client = None


def ask_gemini(prompt: str) -> str:
    if _client is None:
        return "Gemini is not configured. Set GEMINI_API_KEY in .env to enable LLM responses."

    response = _client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
    return response.text or "No response generated."