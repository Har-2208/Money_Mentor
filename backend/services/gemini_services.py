import os
from pathlib import Path
from threading import Lock
from typing import List

from dotenv import load_dotenv
from google import genai

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "models/gemini-2.5-flash")
GEMINI_MODELS = os.getenv("GEMINI_MODELS", "")

if GEMINI_API_KEY:
    _client = genai.Client(api_key=GEMINI_API_KEY)
else:
    _client = None


def _parse_models() -> List[str]:
    raw_models = [m.strip() for m in GEMINI_MODELS.split(",") if m.strip()]
    ordered = [GEMINI_MODEL, *raw_models]

    unique_models: List[str] = []
    seen = set()
    for model in ordered:
        if model not in seen:
            unique_models.append(model)
            seen.add(model)
    return unique_models


_MODEL_LIST = _parse_models()
_model_cursor = 0
_cursor_lock = Lock()


def _extract_text(response) -> str | None:
    text = getattr(response, "text", None)
    if isinstance(text, str) and text.strip():
        return text

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                return part_text
    return None


def _should_failover(exc: Exception) -> bool:
    message = str(exc).lower()
    failover_signals = [
        "quota",
        "rate",
        "429",
        "resource_exhausted",
        "exhausted",
        "unavailable",
        "503",
        "timeout",
        "deadline",
        "internal",
        "model",
    ]
    return any(token in message for token in failover_signals)


def _next_start_index() -> int:
    global _model_cursor
    if not _MODEL_LIST:
        return 0
    with _cursor_lock:
        return _model_cursor % len(_MODEL_LIST)


def _set_model_cursor(index: int) -> None:
    global _model_cursor
    if not _MODEL_LIST:
        return
    with _cursor_lock:
        _model_cursor = index % len(_MODEL_LIST)


def ask_gemini(prompt: str) -> str:
    if _client is None:
        return "Gemini is not configured. Set GEMINI_API_KEY in .env to enable LLM responses."

    if not _MODEL_LIST:
        return "Gemini model list is empty. Set GEMINI_MODEL or GEMINI_MODELS in .env."

    errors = []
    total_models = len(_MODEL_LIST)
    start_index = _next_start_index()

    for offset in range(total_models):
        index = (start_index + offset) % total_models
        model_name = _MODEL_LIST[index]
        try:
            response = _client.models.generate_content(model=model_name, contents=prompt)
            text = _extract_text(response)
            _set_model_cursor(index)
            if text:
                return text
            errors.append(f"{model_name}: empty response")
        except Exception as exc:
            errors.append(f"{model_name}: {exc}")
            if not _should_failover(exc):
                break

    return "Gemini request failed across all configured models. Details: " + " | ".join(errors)