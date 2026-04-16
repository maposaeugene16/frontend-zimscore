import os
import requests
import uuid
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class EcoCashService:
    def __init__(self):
        self.api_url = os.getenv("ECOCASH_API_URL", "https://api.ecocash.co.zw/v1")
        self.username = os.getenv("ECOCASH_API_USERNAME")
        self.password = os.getenv("ECOCASH_API_PASSWORD")
        self.merchant_code = os.getenv("ECOCASH_MERCHANT_CODE")
        self.merchant_pin = os.getenv("ECOCASH_MERCHANT_PIN")
        self.merchant_number = os.getenv("ECOCASH_MERCHANT_NUMBER")
        
        # If credentials are missing, we default to MOCK mode for development
        self.mock_mode = not all([self.username, self.password, self.merchant_code])
        if self.mock_mode:
            print("⚠️ EcoCash Service: Running in MOCK mode (No credentials found in .env)")

    def initiate_deposit(self, mobile_number: str, amount: float, reference: str) -> Dict[str, Any]:
        """
        Initiates a Customer-to-Business (C2B) payment (Pay-In).
        This triggers a USSD push to the user's phone.
        """
        if self.mock_mode:
            return {
                "status": "Success",
                "transaction_id": str(uuid.uuid4()),
                "message": f"MOCK: USSD Push sent to {mobile_number} for ${amount}",
                "client_correlator": str(uuid.uuid4())
            }

        payload = {
            "clientCorrelator": str(uuid.uuid4()),
            "notifyUrl": os.getenv("ECOCASH_NOTIFY_URL", "https://api.zimscore.co.zw/api/ecocash/callback"),
            "referenceCode": reference,
            "tranType": "C2B",
            "endUserId": mobile_number,
            "remarks": "ZimScore Wallet Deposit",
            "transactionOperationStatus": "Charged",
            "paymentAmount": {
                "charginginformation": {
                    "amount": float(amount),
                    "currency": "USD",
                    "description": "Wallet Funding"
                },
                "chargeMetaData": {
                    "channel": "WEB",
                    "purchaseCategoryCode": "General",
                    "onBeHalfOf": "ZimScore"
                }
            },
            "merchantCode": self.merchant_code,
            "merchantPin": self.merchant_pin,
            "merchantNumber": self.merchant_number
        }

        try:
            response = requests.post(
                f"{self.api_url}/transactions/amount",
                json=payload,
                auth=(self.username, self.password),
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"status": "Error", "message": str(e)}

    def initiate_withdrawal(self, mobile_number: str, amount: float, reference: str) -> Dict[str, Any]:
        """
        Initiates a Business-to-Customer (B2C) payment (Pay-Out).
        Disburses funds from the merchant wallet to the user.
        """
        if self.mock_mode:
            return {
                "status": "Success",
                "transaction_id": str(uuid.uuid4()),
                "message": f"MOCK: Disbursement of ${amount} to {mobile_number} initiated",
                "client_correlator": str(uuid.uuid4())
            }

        payload = {
            "clientCorrelator": str(uuid.uuid4()),
            "notifyUrl": os.getenv("ECOCASH_NOTIFY_URL", "https://api.zimscore.co.zw/api/ecocash/callback"),
            "referenceCode": reference,
            "tranType": "B2C",
            "endUserId": mobile_number,
            "remarks": "ZimScore Wallet Withdrawal",
            "transactionOperationStatus": "Disbursed",
            "paymentAmount": {
                "charginginformation": {
                    "amount": float(amount),
                    "currency": "USD",
                    "description": "Wallet Withdrawal"
                }
            },
            "merchantCode": self.merchant_code,
            "merchantPin": self.merchant_pin,
            "merchantNumber": self.merchant_number
        }

        try:
            # Note: Disbursement endpoint may vary by API version (e.g., /transactions/disbursement)
            response = requests.post(
                f"{self.api_url}/transactions/amount", 
                json=payload,
                auth=(self.username, self.password),
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"status": "Error", "message": str(e)}

    def check_status(self, client_correlator: str) -> Dict[str, Any]:
        """
        Queries the status of a previous transaction.
        """
        if self.mock_mode:
            return {"status": "Success", "transactionOperationStatus": "Charged"}

        try:
            response = requests.get(
                f"{self.api_url}/transactions/amount/{client_correlator}",
                auth=(self.username, self.password),
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {"status": "Error", "message": str(e)}
