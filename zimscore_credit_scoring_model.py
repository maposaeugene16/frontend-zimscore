#!/usr/bin/env python3
"""
Zimscore Credit Scoring Model v1.0
===================================
Implements the exact scoring formulas from the Zimscore SRS v1.1
and the Tafadzwa Worked Example document.

Two phases:
  Phase 1 (Bootstrap): For new users with no loan history
    (Income×0.35) + (Expense×0.30) + (Payment×0.20) + (Savings×0.15)
  
  Phase 2 (After 6+ months with loan history):
    (Repayment×0.40) + (Financial×0.40) + (Utilization×0.10) + (History×0.10)

Final Zimscore = Base_Score × 8.5 → range 0–850
Confidence = min(90, (months_of_data × 15) + 25)

Score Bands:
  Poor:       0–299   (Very High risk)
  Fair:       300–499  (High risk)
  Good:       500–649  (Medium risk)
  Very Good:  650–749  (Low risk)
  Excellent:  750–850  (Very Low risk)

Author: Zimscore AI Engine
"""

import json
import statistics
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict
from datetime import datetime, timedelta

# ─────────────────────────────────────────────────
# Data Classes
# ─────────────────────────────────────────────────

@dataclass
class Transaction:
    id: str
    type: str        # "credit" (deposit/income), "debit" (expense/withdrawal)
    description: str
    amount: float
    date: str        # "YYYY-MM-DD"
    category: str
    reference: Optional[str] = None
    counterpartyId: Optional[str] = None
    balance_after: Optional[float] = None

@dataclass
class BillPayment:
    bill_name: str
    expected_date: str
    actual_date: str
    on_time: bool
    days_late: int = 0

@dataclass
class LoanRecord:
    loan_id: str
    amount: float
    term_weeks: int
    interest_rate: float
    repaid_on_time: bool
    days_early: int = 0
    days_late: int = 0

@dataclass
class WeeklyData:
    week_number: int
    income: float
    expenses: float
    ending_balance: float

@dataclass
class ScoreResult:
    # Component scores (0–100)
    income_stability_score: float
    expense_ratio_score: float
    payment_history_score: float
    savings_behaviour_score: float
    # Phase 2 extras (optional)
    repayment_history_score: Optional[float] = None
    credit_utilization_score: Optional[float] = None
    history_length_score: Optional[float] = None
    # Aggregated
    base_score: float = 0.0
    final_zimscore: int = 0
    band: str = ""
    risk_level: str = ""
    confidence: int = 0
    phase: int = 1
    # Details
    avg_weekly_income: float = 0.0
    avg_deviation_pct: float = 0.0
    expense_ratio: float = 0.0
    savings_frequency: float = 0.0
    avg_balance: float = 0.0
    months_of_data: int = 0

# ─────────────────────────────────────────────────
# Scoring Functions (exact SRS formulas)
# ─────────────────────────────────────────────────

def calc_income_stability(weekly_incomes: list[float]) -> tuple[float, float, float]:
    """
    Income Stability Score = 100 − (avg_weekly_deviation_% × 2)
    Returns: (score, avg_income, avg_deviation_pct)
    """
    if not weekly_incomes or len(weekly_incomes) < 2:
        return (50.0, 0.0, 25.0)
    
    avg = statistics.mean(weekly_incomes)
    if avg == 0:
        return (50.0, 0.0, 25.0)
    
    deviations = [abs(w - avg) / avg * 100 for w in weekly_incomes]
    avg_dev = statistics.mean(deviations)
    
    score = 100 - (avg_dev * 2)
    score = max(0, min(100, score))
    return (round(score, 1), round(avg, 2), round(avg_dev, 1))


def calc_expense_ratio(total_income: float, total_expenses: float) -> tuple[float, float]:
    """
    If ratio ≤ 0.50 → Score = 100
    If ratio > 0.50 → Score = 100 − ((ratio − 0.50) × 200)
    Returns: (score, ratio)
    """
    if total_income == 0:
        return (0.0, 1.0)
    
    ratio = total_expenses / total_income
    
    if ratio <= 0.50:
        score = 100.0
    else:
        score = 100 - ((ratio - 0.50) * 200)
    
    score = max(0, min(100, score))
    return (round(score, 1), round(ratio, 3))


def calc_payment_history(bill_payments: list[BillPayment], months_active: int) -> float:
    """
    Payment History Score = (on_time_% × 100) + (months_active × 2) − (late_count × 5)
    """
    if not bill_payments:
        return 50.0  # neutral if no data
    
    on_time = sum(1 for b in bill_payments if b.on_time)
    total = len(bill_payments)
    late_count = total - on_time
    
    on_time_pct = on_time / total
    
    freq_bonus = min(10, months_active * 2)
    late_penalty = late_count * 5
    
    score = (on_time_pct * 100) + freq_bonus - late_penalty
    score = max(0, min(100, score))
    return round(score, 1)


def calc_savings_behaviour(weekly_balances: list[float], threshold: float = 20.0) -> tuple[float, float, float]:
    """
    Savings frequency = weeks where balance increased ≥ threshold / measurable weeks
    Avg balance modifier = min(50, avg_balance / 5)
    Savings Score = (savings_frequency × 50) + avg_balance_modifier
    Returns: (score, savings_frequency, avg_balance)
    """
    if len(weekly_balances) < 2:
        return (25.0, 0.0, 0.0)
    
    saving_weeks = 0
    measurable = len(weekly_balances) - 1
    
    for i in range(1, len(weekly_balances)):
        change = weekly_balances[i] - weekly_balances[i - 1]
        if change >= threshold:
            saving_weeks += 1
    
    savings_freq = saving_weeks / measurable if measurable > 0 else 0
    avg_balance = statistics.mean(weekly_balances)
    avg_balance_mod = min(50, avg_balance / 5)
    
    score = (savings_freq * 50) + avg_balance_mod
    score = max(0, min(100, score))
    return (round(score, 1), round(savings_freq, 3), round(avg_balance, 2))


def calc_repayment_history(loans: list[LoanRecord]) -> float:
    """Phase 2: Loan repayment score with early bonus."""
    if not loans:
        return 0.0
    on_time = sum(1 for l in loans if l.repaid_on_time)
    early_bonus = sum(min(5, l.days_early) for l in loans if l.days_early > 0)
    late_penalty = sum(l.days_late * 3 for l in loans if l.days_late > 0)
    base = (on_time / len(loans)) * 100
    score = base + early_bonus - late_penalty
    return round(max(0, min(100, score)), 1)


def calc_credit_utilization(current_debt: float, monthly_income: float) -> float:
    """Phase 2: Lower utilization = better score."""
    if monthly_income == 0:
        return 0.0
    ratio = current_debt / monthly_income
    if ratio <= 0.30:
        return 100.0
    elif ratio <= 0.50:
        return round(100 - ((ratio - 0.30) * 250), 1)
    else:
        return round(max(0, 100 - ((ratio - 0.30) * 250)), 1)


def calc_history_length(months_data: int, num_loans: int) -> float:
    """Phase 2: More history = better score."""
    month_score = min(60, months_data * 6.67)
    loan_score = min(40, num_loans * 13.33)
    return round(min(100, month_score + loan_score), 1)


def get_band(score: int) -> tuple[str, str]:
    """Return (band, risk_level) for a Zimscore."""
    if score >= 750: return ("Excellent", "Very Low")
    if score >= 650: return ("Very Good", "Low")
    if score >= 500: return ("Good", "Medium")
    if score >= 300: return ("Fair", "High")
    return ("Poor", "Very High")


def calc_confidence(months_of_data: int) -> int:
    """Confidence = min(90, (months_of_data × 15) + 25)"""
    return min(90, (months_of_data * 15) + 25)


def aggregate_transactions_to_weekly_data(transactions: List[Transaction]) -> List[WeeklyData]:
    """
    Groups raw transactions by week and calculates totals.
    Week 1 starts from the first transaction date.
    """
    if not transactions:
        return []

    # Sort by date
    sorted_txs = sorted(transactions, key=lambda x: x.date)
    start_date = datetime.strptime(sorted_txs[0].date, "%Y-%m-%d")
    
    weeks: Dict[int, Dict] = {}
    
    current_balance = 0.0 # Starting assumed 0 if not provided in txs
    
    for tx in sorted_txs:
        tx_date = datetime.strptime(tx.date, "%Y-%m-%d")
        week_num = ((tx_date - start_date).days // 7) + 1
        
        if week_num not in weeks:
            weeks[week_num] = {"income": 0.0, "expenses": 0.0, "balance": 0.0}
            
        if tx.type == "credit":
            weeks[week_num]["income"] += tx.amount
            current_balance += tx.amount
        else:
            weeks[week_num]["expenses"] += tx.amount
            current_balance -= tx.amount
            
        weeks[week_num]["balance"] = tx.balance_after if tx.balance_after is not None else current_balance

    return [
        WeeklyData(
            week_number=wn,
            income=data["income"],
            expenses=data["expenses"],
            ending_balance=data["balance"]
        )
        for wn, data in sorted(weeks.items())
    ]


def identify_bill_payments(transactions: List[Transaction]) -> List[BillPayment]:
    """
    Identifies potential bill payments from transaction descriptions.
    In a real system, this would use more sophisticated NLP or merchant IDs.
    """
    bill_keywords = ["ZESA", "Rent", "City of Harare", "Insurance", "DSTV", "Liquid"]
    bill_payments = []
    
    for tx in transactions:
        if tx.type == "debit" and any(k.lower() in tx.description.lower() for k in bill_keywords):
            # For simplicity in this demo, we treat all identified bills as 'on time' 
            # unless late-dates are provided.
            bill_payments.append(BillPayment(
                bill_name=tx.description,
                expected_date=tx.date,
                actual_date=tx.date,
                on_time=True,
                days_late=0
            ))
            
    return bill_payments


# ─────────────────────────────────────────────────
# Main Scoring Engine
# ─────────────────────────────────────────────────

def calculate_zimscore(
    weekly_data: list[WeeklyData],
    bill_payments: list[BillPayment],
    months_of_data: int = 3,
    # Phase 2 inputs (optional)
    loans: Optional[list[LoanRecord]] = None,
    current_debt: float = 0.0,
    monthly_income: float = 0.0,
) -> ScoreResult:
    """
    Full Zimscore calculation engine.
    Automatically selects Phase 1 or Phase 2 based on loan history.
    """
    weekly_incomes = [w.income for w in weekly_data]
    weekly_balances = [w.ending_balance for w in weekly_data]
    total_income = sum(weekly_incomes)
    total_expenses = sum(w.expenses for w in weekly_data)
    
    # Component scores
    inc_score, avg_inc, avg_dev = calc_income_stability(weekly_incomes)
    exp_score, exp_ratio = calc_expense_ratio(total_income, total_expenses)
    pay_score = calc_payment_history(bill_payments, months_of_data)
    sav_score, sav_freq, avg_bal = calc_savings_behaviour(weekly_balances)
    
    result = ScoreResult(
        income_stability_score=inc_score,
        expense_ratio_score=exp_score,
        payment_history_score=pay_score,
        savings_behaviour_score=sav_score,
        avg_weekly_income=avg_inc,
        avg_deviation_pct=avg_dev,
        expense_ratio=exp_ratio,
        savings_frequency=sav_freq,
        avg_balance=avg_bal,
        months_of_data=months_of_data,
    )
    
    # Determine phase
    has_loans = loans and len(loans) > 0 and months_of_data >= 6
    
    if has_loans:
        # Phase 2
        rep_score = calc_repayment_history(loans)
        fin_behaviour = round((inc_score + exp_score) / 2, 1)  # combined financial behaviour
        util_score = calc_credit_utilization(current_debt, monthly_income)
        hist_score = calc_history_length(months_of_data, len(loans))
        
        base = (rep_score * 0.40) + (fin_behaviour * 0.40) + (util_score * 0.10) + (hist_score * 0.10)
        
        result.phase = 2
        result.repayment_history_score = rep_score
        result.credit_utilization_score = util_score
        result.history_length_score = hist_score
    else:
        # Phase 1 (Bootstrap)
        base = (inc_score * 0.35) + (exp_score * 0.30) + (pay_score * 0.20) + (sav_score * 0.15)
        result.phase = 1
    
    result.base_score = round(base, 2)
    result.final_zimscore = max(0, min(850, round(base * 8.5)))
    result.band, result.risk_level = get_band(result.final_zimscore)
    result.confidence = calc_confidence(months_of_data)
    
    return result


# ─────────────────────────────────────────────────
# Tafadzwa Worked Example Verification
# ─────────────────────────────────────────────────

def run_tafadzwa_example():
    """Replicate the exact Tafadzwa example from the SRS document."""
    
    print("=" * 60)
    print("ZIMSCORE CREDIT SCORING MODEL — VERIFICATION")
    print("Worked Example: Tafadzwa (Mbare Musika trader)")
    print("=" * 60)
    
    # Weekly income data (12 weeks, 3 months)
    weekly_incomes = [150, 120, 130, 145, 140, 135, 155, 125, 160, 140, 130, 150]
    weekly_expenses = [45, 30, 53, 45, 43, 40, 42, 46, 49, 41, 40, 48]
    weekly_balances = [165, 90, 210, 122, 192, 85, 178, 95, 205, 110, 185, 130]
    
    weekly_data = [
        WeeklyData(i+1, weekly_incomes[i], weekly_expenses[i], weekly_balances[i])
        for i in range(12)
    ]
    
    # Bill payments
    bills = [
        BillPayment("ZESA", "22 Jan", "22 Jan", True, 0),
        BillPayment("Rent", "30 Jan", "30 Jan", True, 0),
        BillPayment("ZESA", "22 Feb", "22 Feb", True, 0),
        BillPayment("Rent", "28 Feb", "28 Feb", True, 0),
        BillPayment("ZESA", "22 Mar", "23 Mar", False, 1),
        BillPayment("Rent", "31 Mar", "31 Mar", True, 0),
    ]
    
    # Phase 1 calculation
    result = calculate_zimscore(weekly_data, bills, months_of_data=3)
    
    print("\n─── PHASE 1 (BOOTSTRAP) ───")
    print(f"\n1. Income Stability Score:    {result.income_stability_score}/100")
    print(f"   Avg weekly income:         ${result.avg_weekly_income}")
    print(f"   Avg deviation:             {result.avg_deviation_pct}%")
    print(f"   Expected (from doc):       85/100")
    
    print(f"\n2. Expense-to-Income Score:   {result.expense_ratio_score}/100")
    print(f"   Expense ratio:             {result.expense_ratio*100:.1f}%")
    print(f"   Expected (from doc):       100/100")
    
    print(f"\n3. Payment History Score:     {result.payment_history_score}/100")
    print(f"   Expected (from doc):       84/100")
    
    print(f"\n4. Savings Behaviour Score:   {result.savings_behaviour_score}/100")
    print(f"   Savings frequency:         {result.savings_frequency*100:.1f}%")
    print(f"   Avg balance:               ${result.avg_balance}")
    print(f"   Expected (from doc):       ~52/100")
    
    print(f"\n─── WEIGHTED CALCULATION ───")
    print(f"   Formula: (Inc×0.35) + (Exp×0.30) + (Pay×0.20) + (Sav×0.15)")
    inc_c = result.income_stability_score * 0.35
    exp_c = result.expense_ratio_score * 0.30
    pay_c = result.payment_history_score * 0.20
    sav_c = result.savings_behaviour_score * 0.15
    print(f"   = ({result.income_stability_score}×0.35) + ({result.expense_ratio_score}×0.30) + ({result.payment_history_score}×0.20) + ({result.savings_behaviour_score}×0.15)")
    print(f"   = {inc_c:.2f} + {exp_c:.2f} + {pay_c:.2f} + {sav_c:.2f}")
    print(f"   Base Score:                {result.base_score}")
    print(f"   Final Zimscore:            {result.final_zimscore}")
    print(f"   Band:                      {result.band}")
    print(f"   Risk Level:                {result.risk_level}")
    print(f"   Confidence:                {result.confidence}%")
    print(f"   Expected (from doc):       717, Good")
    
    # Phase 2 calculation (after 6 months with loans)
    print("\n\n─── PHASE 2 (AFTER 6 MONTHS + LOANS) ───")
    loans = [
        LoanRecord("L001", 50, 4, 10.0, True, days_early=2),
        LoanRecord("L002", 60, 4, 8.0, True, days_early=0),
        LoanRecord("L003", 60, 4, 7.0, True, days_early=0),
    ]
    
    result2 = calculate_zimscore(
        weekly_data, bills, months_of_data=9,
        loans=loans, current_debt=60, monthly_income=200
    )
    
    print(f"   Repayment History Score:   {result2.repayment_history_score}/100")
    print(f"   Credit Utilization Score:  {result2.credit_utilization_score}/100")
    print(f"   History Length Score:       {result2.history_length_score}/100")
    print(f"   Final Zimscore:            {result2.final_zimscore}")
    print(f"   Band:                      {result2.band}")
    print(f"   Confidence:                {result2.confidence}%")
    print(f"   Expected (from doc):       784, Excellent")
    
    # Output as JSON for integration
    print("\n\n─── JSON OUTPUT (for API integration) ───")
    print(json.dumps(asdict(result), indent=2))
    
    print("\n─── Phase 2 JSON ───")
    print(json.dumps(asdict(result2), indent=2))
    
    return result, result2


if __name__ == "__main__":
    run_tafadzwa_example()
