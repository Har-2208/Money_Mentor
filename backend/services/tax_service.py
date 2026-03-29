from typing import Dict

from backend.agents.orshestrator import run_tax_feature


def generate_tax_analysis(
    user_id: str,
    salary: float | None = None,
    deductions: Dict[str, float] | None = None,
):
    return run_tax_feature(user_id, salary, deductions)