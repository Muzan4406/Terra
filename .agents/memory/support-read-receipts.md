---
name: Support read receipts
description: Preserve accurate unread badges when support threads are paginated.
---

Only mark inbound support messages as read when they are included in the message window returned to the open thread. Do not clear every unread message for a conversation before applying its result limit.

**Why:** A bounded thread response cannot show older messages outside its window. Marking those rows read would remove their unread indicators even though the recipient never saw them.

**How to apply:** When changing chat pagination, query the displayed message IDs first and update read state only for those IDs. Keep automatic system acknowledgements outside user/admin unread counts.