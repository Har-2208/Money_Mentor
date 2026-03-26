from typing import Dict, Optional

from backend.config import get_env_str


def get_supabase_rest_config() -> Optional[Dict[str, str]]:
    url = get_env_str("SUPABASE_URL", "").strip().rstrip("/")
    key = get_env_str("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not url or not key:
        return None

    return {
        "base_url": f"{url}/rest/v1",
        "api_key": key,
    }
