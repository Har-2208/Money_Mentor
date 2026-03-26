def calculate_tax_old(income: float, deductions: float) -> float:
    taxable = max(income - deductions, 0)

    if taxable <= 250000:
        tax = 0
    elif taxable <= 500000:
        tax = (taxable - 250000) * 0.05
    elif taxable <= 1000000:
        tax = 12500 + (taxable - 500000) * 0.2
    else:
        tax = 112500 + (taxable - 1000000) * 0.3

    return round(tax, 2)


def calculate_tax_new(income: float) -> float:
    if income <= 300000:
        tax = 0
    elif income <= 600000:
        tax = (income - 300000) * 0.05
    elif income <= 900000:
        tax = 15000 + (income - 600000) * 0.1
    elif income <= 1200000:
        tax = 45000 + (income - 900000) * 0.15
    elif income <= 1500000:
        tax = 90000 + (income - 1200000) * 0.2
    else:
        tax = 150000 + (income - 1500000) * 0.3

    return round(tax, 2)