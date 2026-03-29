from backend.agents.orshestrator import run_portfolio_feature


def generate_portfolio_xray(file_bytes: bytes):
    return run_portfolio_feature(file_bytes)