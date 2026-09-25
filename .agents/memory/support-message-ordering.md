---
name: Support message ordering
description: Keep chat messages and automatic acknowledgements in reliable chronological order.
---

Use PostgreSQL `clock_timestamp()` for support-message creation timestamps when a user message and its automatic acknowledgement are inserted in one transaction. PostgreSQL `now()`/`CURRENT_TIMESTAMP` is fixed at transaction start, so both rows can receive the same timestamp and query ordering becomes ambiguous.

**Why:** The conversation is displayed and summarized by timestamp; a tied timestamp can make an acknowledgement appear before the message that triggered it.

**How to apply:** Preserve per-call timestamps when changing support-message persistence. If future code inserts several messages in one bulk statement, add an explicit ordering key rather than relying on timestamp ties.