# NovaMart Payments & Billing Support
Version: 2.7 | Effective: 2026-07-20 | Owner: Payments Operations

## Failed Payment
A failed payment does not necessarily mean an order was created. Verify order state and payment status before asking the customer to retry.

## Duplicate Charge
When two charges are reported, determine whether one is only a temporary authorization. If both transactions were captured, Payments should review the duplicate for reversal or refund.

## Pending Authorization
A pending card authorization may disappear automatically if the transaction is not captured. Do not promise an exact release time because it depends on the payment provider.

## Refund Not Received
For an approved refund, verify the refund transaction and processing date. If the internal processing window has passed and the financial institution has not received the credit, escalate to Payments.

## Security
Never ask for a full card number, CVV, password, or one-time authentication code.
