---
name: Separated account balances
description: User-approved rules for how the app treats deposits, withdrawals, and financial credits.
---

Existing account balances remain in the deposit balance. Product purchases spend from the deposit balance first, then the withdrawal balance. Withdrawal requests debit only the withdrawal balance. Product gains move to the withdrawal balance at maturity, and approved proof commissions credit the withdrawal balance.

**Why:** The user selected this balance policy and explicitly deferred production migration and live-balance changes.

**How to apply:** Preserve these rules in financial routes and any future migration; never move historical balances automatically without renewed user direction.