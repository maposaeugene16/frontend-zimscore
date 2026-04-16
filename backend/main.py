import sys
import os
import uuid
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

# Add parent directory to path to import the model
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import zimscore_credit_scoring_model as scoring
from ecocash_service import EcoCashService

app = FastAPI(title="Zimscore Credit Scoring API")
ecocash = EcoCashService()

class WeeklyDataRequest(BaseModel):
    week_number: int
    income: float
    expenses: float
    ending_balance: float

class TransactionRequest(BaseModel):
    id: str
    type: str # "credit" or "debit"
    description: str
    amount: float
    date: str
    category: str
    reference: Optional[str] = None
    counterpartyId: Optional[str] = None
    balance_after: Optional[float] = None

class BillPaymentRequest(BaseModel):
    bill_name: str
    expected_date: str
    actual_date: str
    on_time: bool
    days_late: int = 0

class LoanRecordRequest(BaseModel):
    loan_id: str
    amount: float
    term_weeks: int
    interest_rate: float
    repaid_on_time: bool
    days_early: int = 0
    days_late: int = 0

class EcoCashRequest(BaseModel):
    mobile_number: str
    amount: float
    reference: Optional[str] = None

class ScoreCalculationRequest(BaseModel):
    weekly_data: Optional[List[WeeklyDataRequest]] = None
    transactions: Optional[List[TransactionRequest]] = None
    bill_payments: Optional[List[BillPaymentRequest]] = None
    months_of_data: int = 3
    loans: Optional[List[LoanRecordRequest]] = None
    current_debt: float = 0.0
    monthly_income: float = 0.0

@app.post("/api/calculate-score")
def calculate_score(request: ScoreCalculationRequest):
    # Process transactions if provided
    if request.transactions:
        py_txs = [scoring.Transaction(**t.model_dump()) for t in request.transactions]
        weekly_data = scoring.aggregate_transactions_to_weekly_data(py_txs)
        bill_payments = scoring.identify_bill_payments(py_txs)
    else:
        # Fallback to provided aggregated data
        weekly_data = [scoring.WeeklyData(**w.model_dump()) for w in request.weekly_data] if request.weekly_data else []
        bill_payments = [scoring.BillPayment(**b.model_dump()) for b in request.bill_payments] if request.bill_payments else []
    
    loans = [scoring.LoanRecord(**l.model_dump()) for l in request.loans] if request.loans else None
    
    result = scoring.calculate_zimscore(
        weekly_data=weekly_data,
        bill_payments=bill_payments,
        months_of_data=request.months_of_data,
        loans=loans,
        current_debt=request.current_debt,
        monthly_income=request.monthly_income
    )
    
    return result

@app.post("/api/ecocash/deposit")
def ecocash_deposit(request: EcoCashRequest):
    reference = request.reference or f"DEP-{uuid.uuid4().hex[:8].upper()}"
    return ecocash.initiate_deposit(request.mobile_number, request.amount, reference)

@app.post("/api/ecocash/withdraw")
def ecocash_withdraw(request: EcoCashRequest):
    reference = request.reference or f"WTH-{uuid.uuid4().hex[:8].upper()}"
    return ecocash.initiate_withdrawal(request.mobile_number, request.amount, reference)

@app.get("/api/ecocash/status/{client_correlator}")
def ecocash_status(client_correlator: str):
    return ecocash.check_status(client_correlator)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
