---
name: Separated account balances
description: User-approved rules for how the app treats deposits, withdrawals, and financial credits.
---

Existing account balances remain in the deposit balance. Product purchases spend from the deposit balance first, then the withdrawal balance. Withdrawal requests debit only the withdrawal balance. Product gains stay locked throughout the administrator-defined product duration; after maturity, the user must collect them manually. Credit the product's total announced return saved at purchase only to the withdrawal balance, and never pay it automatically. Approved proof commissions also credit the withdrawal balance.

**Why:** The user requested manual collection at maturity and selected the product's total announced amount as the payout. Existing account balances and historical records must remain unchanged.

**How to apply:** Use the purchase snapshot for the duration and payout amount. Enforce maturity and one-time collection on the server in a transaction; credit withdrawal balance and record one earnings entry. Do not move historical balances automatically.