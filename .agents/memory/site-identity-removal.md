---
name: Site identity removal
description: Project-specific requirement to keep the interface free of the former brand identity and decorative imagery.
---

Do not reuse former page presentations or decorative imagery. Use Beko branding where the user explicitly requests it, including the site logo on À propos. For Beko UI, use the icons the user supplied, not Signa Group icons. Preserve user-submitted support attachments and withdrawal-proof screenshots.

When redesigning a page, replace its previous visual presentation completely; do not leave visible fragments of the old page. Apply this rule to future modifications as well.

**Why:** The user requested full page redesigns, clarified that the site logo should appear on À propos, and explicitly rejected Signa Group icons for Beko.

**How to apply:** Replace old layouts and styling rather than layering over them. Keep requested Beko identity on the pages the user names, use user-supplied Beko icons instead of Signa Group assets, and preserve user-uploaded evidence in support and proof workflows.

When the user provides visual references for authentication, apply them to both the login and registration pages; changing another shared surface such as navigation is not a substitute.

**Why:** The user corrected a prior interpretation that updated navigation but left the login and registration pages untouched.

**How to apply:** Check `/login` and `/register` when implementing authentication references, while keeping the Beko identity.

For app navigation, remove the five-button bottom navigation from all app pages. Keep the hamburger sidebar available throughout signed-in user and admin pages.

**Why:** The user corrected the earlier dashboard-only interpretation and requested the sidebar throughout the app.

**How to apply:** Do not restore the bottom navigation on any page; preserve the sidebar trigger across signed-in user and admin routes.

The withdrawal-proof page is a public feed for signed-in users: show only administrator-approved proofs, with the user's name, both submitted images, and the gain assigned by the administrator. Keep proof submission on a separate page opened by a “Publier ma preuve” action; admins review, approve or reject proofs, and set the gain.

**Why:** The user explicitly described this public proof and administration workflow.

**How to apply:** Never expose pending or rejected proofs in the public feed. Keep review and gain assignment in the admin panel and maintain the two-image submission flow.