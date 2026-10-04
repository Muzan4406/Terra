---
name: Separated account balances
description: User-approved rules for how the app treats deposits, withdrawals, and financial credits.
---

Existing account balances remain in the deposit balance. Product purchases spend from the deposit balance first, then the withdrawal balance. Withdrawal requests debit only the withdrawal balance. Product gains stay locked in the investment's pending amount throughout the administrator-defined product duration and credit only the withdrawal balance at maturity. Approved proof commissions also credit the withdrawal balance.

**Why:** The user selected and reiterated this balance policy, including the administrator-defined product cycle, and explicitly deferred production migration and live-balance changes.

**How to apply:** Preserve these rules in financial routes and any future migration; never move historical balances automatically without renewed user direction.