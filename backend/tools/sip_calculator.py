# tools/sip_calculator.py

def calculate_sip(target_amount, years, annual_rate=0.12):
    monthly_rate = annual_rate / 12
    months = years * 12

    sip = target_amount * monthly_rate / ((1 + monthly_rate)**months - 1)
    return round(sip, 2)