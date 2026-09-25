# Terra oil Investment Platform - Design Guidelines

## Design Approach
**Mobile-first financial interface**: Emphasize clear account information, restrained styling, and accessible controls for mobile users.

## Core Design Principles
1. **Financial Transparency**: Prominent balances, clear transaction states, visible VIP tier benefits
2. **Mobile-First Efficiency**: 44px minimum touch targets, bottom navigation, minimal scrolling to critical actions
3. **Consistent Branding**: Use the Terra oil name consistently and avoid unrelated third-party brand assets
4. **Status-Driven Feedback**: Clear visual states for pending deposits, active investments, withdrawal locks

## Color System

**Primary Palette** (professional blues):
- Primary Blue: `bg-blue-600` (#2563eb) - CTAs, active states, tier badges
- Primary Hover: `bg-blue-700` - Button hover states
- Deep Blue: `bg-blue-900` - Headers, important labels
- Light Blue: `bg-blue-50` - Card backgrounds, subtle highlights
- Accent Blue: `bg-blue-500` - Links, secondary actions

**Semantic Colors**:
- Success: `bg-green-600` - Approved withdrawals, positive gains
- Warning: `bg-amber-500` - Pending states, tier expiration alerts
- Error: `bg-red-600` - Rejected transactions, withdrawal blocks
- Neutral Dark: `bg-slate-800` - Body text, primary content
- Neutral Medium: `bg-slate-500` - Labels, timestamps
- Neutral Light: `bg-slate-100` - Borders, dividers

**Surface Colors**:
- Background: `bg-white`
- Card Surface: `bg-white` with `border border-slate-200`
- Admin Sidebar: `bg-slate-900`
- Bottom Tab Bar: `bg-white` with `border-t border-slate-200`

## Typography System

**Font**: Inter via Google Fonts CDN

**Scale**:
- Balance/Revenue Displays: `text-3xl font-bold` (#3,450 FCFA)
- VIP Tier Prices: `text-2xl font-bold` (5,000 FCFA)
- Section Headers: `text-lg font-semibold` (Mes Investissements)
- Body/Labels: `text-sm font-medium` (Solde actuel)
- Helper Text: `text-xs text-slate-500` (Dernière mise à jour)
- Buttons: `text-base font-semibold`

## Layout System

**Spacing**: Tailwind units 2, 3, 4, 6, 8, 12, 16
- Screen padding: `px-4`
- Card internal: `p-4` or `p-6`
- Section gaps: `space-y-6`
- Component gaps: `gap-4`
- Bottom nav: `p-4` with `pb-safe`

**Container**: `max-w-md mx-auto` (448px centered on desktop)

## Component Specifications

### Hero Section (Home Screen Top)
Use the supplied solar-energy photography in a responsive carousel. Keep the Terra oil name and welcome text readable over a dark gradient.

Show the Terra oil name and a short description of the account features.

### Balance Cards (Horizontal Pair)
`grid grid-cols-2 gap-3 -mt-8` to overlap hero. Each card: `bg-white rounded-xl p-4 shadow-lg border border-slate-200`. Left: Total Balance with blue accent. Right: Total Revenue with green accent. Large number `text-2xl font-bold`, label `text-xs text-slate-500 uppercase tracking-wide`.

### Primary Action Grid
`grid grid-cols-3 gap-3 mt-6`. Buttons: `bg-blue-50 border border-blue-200 rounded-xl py-4 flex flex-col items-center gap-2`. Heroicons (outline style): `arrow-down-tray`, `arrow-up-tray`, `chat-bubble-left-right`. Icon `w-8 h-8 text-blue-600`, label `text-sm font-medium text-slate-700`.

### VIP Investment Cards
Full-width cards `mb-4`. Structure: `bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-xl p-6`. Top: Tier badge `bg-white/20 backdrop-blur-sm rounded-full px-4 py-1 inline-block`. Price display `text-3xl font-bold`, daily gain `text-green-400 text-sm`, total gain projection. Duration badge `bg-amber-500 text-white rounded-full px-3 py-1 text-xs`. Bottom: `bg-white text-blue-600 font-semibold py-3 rounded-lg w-full` purchase button.

### Bottom Navigation
Fixed `bottom-0 inset-x-0 bg-white border-t border-slate-200`. 5 tabs: Home, Tasks, Invest, Team, Account. Active: `text-blue-600` with icon + label. Inactive: `text-slate-400` icon only. Heroicons: `home`, `clipboard-document-list`, `banknotes`, `users`, `user-circle`.

### Transaction Lists
Tabbed interface: `border-b border-slate-200` tabs with `border-b-2 border-blue-600` active indicator. List items: `bg-white border border-slate-200 rounded-lg p-4 mb-3`. Left: Amount `text-lg font-bold`, method `text-xs text-slate-500`. Right: Status badge (`bg-amber-100 text-amber-700` pending, `bg-green-100 text-green-700` approved). Timestamp `text-xs text-slate-400 mt-1`.

### Profile Header
`bg-blue-600 text-white px-4 py-8`. Avatar `w-20 h-20 rounded-full border-4 border-white/20`, name `text-xl font-bold`, phone `text-sm opacity-90`. "Promoteur" badge when applicable: `bg-amber-500 text-white rounded-full px-3 py-1 text-xs`.

### Forms
Input fields: `border border-slate-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`. Labels: `text-sm font-medium text-slate-700 mb-2`. Submit buttons: `bg-blue-600 text-white font-semibold py-3 rounded-lg w-full hover:bg-blue-700`.

### Admin Dashboard
Sidebar: `bg-slate-900 w-64 fixed h-full` with white nav items. Active: `bg-blue-600 text-white`. Main content: `ml-64 p-8 bg-slate-50`. Stat cards: `grid grid-cols-4 gap-6`, each `bg-white rounded-xl p-6 border border-slate-200`. Tables: `bg-white rounded-xl overflow-hidden` with `border border-slate-200`, striped rows `even:bg-slate-50`.

## Solar Imagery

Use the shared solar image collection for the home carousel, product cards, and supporting page banners. Crop with `object-cover`, keep image corners consistent with nearby cards, and provide descriptive alt text. Keep the Terra oil wordmark as text; navigation remains icon-based.

## Accessibility
- WCAG AA contrast ratios (blue-600 on white = 4.5:1)
- 16px minimum input font sizes (prevent iOS zoom)
- Clear focus states: `focus:ring-2 focus:ring-blue-500`
- Touch targets: 44px minimum (all navigation, CTAs)

## Responsive Breakpoints
- Mobile (base): Single column, full-width cards
- Tablet (md: 768px+): Maintain mobile layout, centered `max-w-md`
- Desktop admin only: Sidebar + content area

This platform prioritizes **professional trust, mobile clarity, and efficient financial management** for French-speaking African users.