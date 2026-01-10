# Cigna Group Investment Platform - Design Guidelines

## Design Approach
**Hybrid Approach**: Combining fintech trust elements (Revolut, Stripe clarity) with African mobile-first patterns (Wave, Flutterwave accessibility). This platform requires both credibility for financial transactions and optimal mobile performance for the target markets.

## Core Design Principles
1. **Mobile-First Financial Clarity**: Clear typography, generous touch targets (minimum 44px), obvious interactive states
2. **Trust Through Transparency**: Prominent display of balances, transaction states, and VIP tier information
3. **Efficient Navigation**: Bottom tab bar for primary navigation, minimal scrolling to critical actions
4. **Status-Driven Design**: Clear visual feedback for pending deposits, active investments, withdrawal states

## Typography System

**Font Family**: Inter (via Google Fonts) for excellent readability at small sizes and professional appearance

**Hierarchy**:
- Account Headers/Balances: text-2xl to text-3xl, font-bold (24-30px)
- Section Titles: text-lg, font-semibold (18px)
- VIP Tier Prices: text-xl, font-bold (20px)
- Body Text/Labels: text-sm, font-medium (14px)
- Helper Text/Timestamps: text-xs, font-normal (12px)
- CTA Buttons: text-base, font-semibold (16px)

## Layout System

**Spacing Units**: Tailwind 2, 3, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4 or p-6
- Section spacing: space-y-4 or space-y-6
- Card gaps: gap-3 or gap-4
- Bottom tab bar: p-4 with safe-area-inset support

**Container Strategy**:
- Max width: max-w-md (mobile-optimized, 448px)
- Full-width cards with px-4 internal padding
- Edge-to-edge images on home screen as specified

## Component Library

### Navigation
**Bottom Tab Bar**: Fixed position with 4 tabs (Home, Tasks, Invest, Team, Account)
- Icons from Heroicons (home, clipboard-document-list, shopping-bag, users, user-circle)
- Active state: icon + label visible
- Inactive: icon only with reduced opacity

### Cards & Containers

**Balance/Revenue Cards** (Home screen horizontal pair):
- Rounded-lg borders, p-4 padding
- Grid layout: grid-cols-2 gap-3
- Large numbers prominently displayed
- Subtle labels underneath

**VIP Tier Cards** (Invest tab):
- Full-width cards with mb-3 spacing
- Tiered visual weight: VIP 6 most prominent
- Structure: Tier badge → Price → Daily gain → Total gain → Duration → CTA button
- Purchase button: w-full, rounded-lg, py-3

**Profile Header Block** (Account tab):
- Full-width with px-4 py-6
- Horizontal layout: Avatar circle (w-16 h-16) → Name/Phone → Expand icon
- Avatar: rounded-full with logo/photo

### Action Buttons

**Primary Actions** (Deposit/Withdraw/Customer Service):
- Grid layout: grid-cols-3 gap-2 or gap-3
- Vertical button style: Icon top, label bottom
- Rounded-lg, py-4, text-center
- Icons from Heroicons (arrow-down-tray, arrow-up-tray, chat-bubble-left-right)

**Transaction Buttons**: Full-width, rounded-lg, py-3, font-semibold

### Forms

**Authentication Forms**:
- Vertical stack with space-y-4
- Input fields: rounded-lg, px-4, py-3, border
- Dropdowns for country/payment method: Consistent styling
- Labels: text-sm, font-medium, mb-2
- Error states: text-xs with validation messages

**Withdrawal Wallet Setup**: Same form patterns with secure information display

### Data Display

**Transaction History**:
- Tabbed interface: Withdrawals, Deposits, Revenue
- List items with clear status indicators (Pending, Approved, Rejected)
- Amount prominently displayed, timestamp subtle
- Swipeable or tappable for details

**Team/Referral Stats**:
- Level badges (Level 1/2/3) with percentage display
- Commission totals in prominent cards
- Referral link copy button: Full-width with icon
- Team member count displays

### Status Indicators

**Investment Status**: Badge components showing active days/remaining
**Transaction States**: Clear color-independent icons (checkmark, clock, x-mark)
**Account Badges**: "Promoteur" badge when applicable
**Withdrawal Lock**: Visual indicator when blocked

## Responsive Behavior

**Mobile (base)**:
- Single column layouts
- Full-width cards and buttons
- Bottom navigation always visible
- 16px minimum font size for inputs (prevent zoom)

**Tablet (md: 768px+)**:
- Maintain mobile layout (this is a mobile-first platform)
- Optional: 2-column grid for VIP tiers
- Centered content with max-w-md

## Admin Dashboard

**Layout**: Traditional sidebar navigation (fixed left) + main content area
**Dashboard Cards**: Grid layout for statistics (total users, deposits, active products)
**Tables**: Sortable/filterable for deposits, withdrawals, user management
**Action Modals**: For approving/rejecting transactions, editing users

## Images

**Home Screen**:
- Top banner: Full-width edge-to-edge Cigna branding image (provided: cigna-healthcare-logo or medical professionals image)
- Bottom section: Another edge-to-edge promotional/trust image
- Both images: object-cover, aspect ratio maintained

**VIP Product Cards**: Optional small icons or badge graphics for tier differentiation

**Profile Avatar**: Circular placeholder or uploaded user photo

**About Us Section**: Use provided medical professional/facility images to establish credibility

This platform prioritizes **clarity, trust, and mobile efficiency** for a French-speaking African audience managing financial investments.