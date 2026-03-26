def get_user_data(user_id: int) -> dict:
    return {
        "user_id": user_id,
        "income": {
            "salary": 2400000,
            "bonus": 200000,
        },
        "expenses": {
            "total": 50000,
        },
        "goals": {
            "retirement_age": 55,
            "current_age": 30,
        },
        "investments": {
            "current_corpus": 800000,
            "monthly_investment": 20000,
            "current_allocation": {
                "equity": 0.65,
                "debt": 0.30,
                "gold": 0.05,
            },
        },
        "tax": {
            "deductions": {
                "80C": 70000,
                "80D": 10000,
            }
        },
        "partner": {
            "salary": 1200000,
            "deductions_80c": 50000,
        },
    }