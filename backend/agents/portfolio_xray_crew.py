from typing import Any, Dict

from backend.tools.portfolio_analyzer import run_portfolio_analysis


class PortfolioParserAgent:
    role = "Portfolio Parser"

    def run(self, file_bytes: bytes) -> Dict[str, Any]:
        return run_portfolio_analysis(file_bytes)


class PortfolioRiskAgent:
    role = "Portfolio Risk Analyst"

    def run(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        payload = analysis["portfolio_analysis"]
        xirr = payload["xirr"]
        risk_note = "Performance is healthy." if xirr >= 10 else "Performance may need allocation tuning."
        payload["risk_note"] = risk_note
        return analysis


class PortfolioComplianceAgent:
    role = "Portfolio Compliance"

    def run(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        analysis["portfolio_analysis"]["compliance_note"] = (
            "This portfolio analysis is educational and should not be treated as execution advice."
        )
        return analysis


def run_portfolio_xray_crew(file_bytes: bytes) -> Dict[str, Any]:
    parser = PortfolioParserAgent()
    risk = PortfolioRiskAgent()
    compliance = PortfolioComplianceAgent()

    analysis = parser.run(file_bytes)
    analysis = risk.run(analysis)
    analysis = compliance.run(analysis)
    return analysis
