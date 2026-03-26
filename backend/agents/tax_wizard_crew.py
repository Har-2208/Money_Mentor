import importlib
from typing import Any, Dict, List

from backend.tools.tax_calculator import calculate_tax_new, calculate_tax_old


_crewai_module = importlib.util.find_spec("crewai")
if _crewai_module is not None:
    crewai = importlib.import_module("crewai")
    Agent = getattr(crewai, "Agent")
    Crew = getattr(crewai, "Crew")
    Process = getattr(crewai, "Process")
    Task = getattr(crewai, "Task")
else:
    Agent = None
    Crew = None
    Process = None
    Task = None


def _suggest_missing_deductions(declared_deductions: Dict[str, float]) -> List[str]:
    suggestions = []
    if declared_deductions.get("80C", 0) < 150000:
        suggestions.append("80C not fully used")
    if declared_deductions.get("80D", 0) <= 0:
        suggestions.append("80D health insurance deduction missing")
    return suggestions


def _investment_recommendations(missing_deductions: List[str]) -> List[str]:
    recs: List[str] = []
    if any("80C" in item for item in missing_deductions):
        recs.extend(["ELSS", "PPF", "Tax Saver FD"])
    if any("80D" in item for item in missing_deductions):
        recs.append("Health insurance top-up")
    recs.append("NPS")
    return recs


def run_tax_wizard_crew(salary: float, deductions: Dict[str, float]) -> Dict[str, Any]:
    if Agent and Crew and Process and Task:
        return _run_with_crewai(salary, deductions)

    return _run_with_fallback_pipeline(salary, deductions)


def _run_with_fallback_pipeline(salary: float, deductions: Dict[str, float]) -> Dict[str, Any]:
    # Agent 1: Tax Calculator Agent
    total_declared = sum(deductions.values())
    old_tax = calculate_tax_old(salary, total_declared)
    new_tax = calculate_tax_new(salary)

    # Agent 2: Tax Optimizer Agent
    missing_deductions = _suggest_missing_deductions(deductions)
    recommendations = _investment_recommendations(missing_deductions)

    # Agent 3: Compliance Agent (non-prescriptive framing)
    best_option = "old_regime" if old_tax < new_tax else "new_regime"

    return {
        "tax_analysis": {
            "old_tax": old_tax,
            "new_tax": new_tax,
            "best_option": best_option,
            "missing_deductions": missing_deductions,
            "recommendations": recommendations,
            "compliance_note": "This is educational guidance and not a binding recommendation.",
        }
    }


def _run_with_crewai(salary: float, deductions: Dict[str, float]) -> Dict[str, Any]:
    total_declared = sum(deductions.values())

    calculator_agent = Agent(
        role="Tax Calculator",
        goal="Compute tax under old and new regimes accurately.",
        backstory="You are a precise Indian personal taxation specialist.",
        verbose=False,
    )
    optimizer_agent = Agent(
        role="Tax Optimizer",
        goal="Suggest legal deductions and tax-efficient investment options.",
        backstory="You understand Indian tax deduction sections and practical optimization patterns.",
        verbose=False,
    )
    compliance_agent = Agent(
        role="Compliance Officer",
        goal="Ensure guidance remains educational and non-prescriptive.",
        backstory="You review output for compliance-safe language.",
        verbose=False,
    )

    task_1 = Task(
        description=(
            "Calculate old and new regime taxes for salary "
            f"{salary} and total deductions {total_declared}."
        ),
        expected_output="Dictionary-style response with old_tax, new_tax, and best_option.",
        agent=calculator_agent,
    )
    task_2 = Task(
        description=(
            "Review deductions and suggest missing deductions plus recommendations "
            "from ELSS, NPS, and Tax Saver FD where relevant."
        ),
        expected_output="Dictionary-style response with missing_deductions and recommendations.",
        agent=optimizer_agent,
    )
    task_3 = Task(
        description="Add a compliance-safe non-prescriptive note to the final analysis.",
        expected_output="A single compliance note sentence.",
        agent=compliance_agent,
    )

    crew = Crew(
        agents=[calculator_agent, optimizer_agent, compliance_agent],
        tasks=[task_1, task_2, task_3],
        process=Process.sequential,
        verbose=False,
    )
    crew.kickoff()

    # Keep deterministic output schema for downstream systems.
    missing_deductions = _suggest_missing_deductions(deductions)
    recommendations = _investment_recommendations(missing_deductions)
    old_tax = calculate_tax_old(salary, total_declared)
    new_tax = calculate_tax_new(salary)

    return {
        "tax_analysis": {
            "old_tax": old_tax,
            "new_tax": new_tax,
            "best_option": "old_regime" if old_tax < new_tax else "new_regime",
            "missing_deductions": missing_deductions,
            "recommendations": recommendations,
            "compliance_note": "This is educational guidance and not a binding recommendation.",
        }
    }
