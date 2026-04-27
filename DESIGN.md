# BidCard TH DESIGN.md

Plain-text design system for a Thai trading card auction and resale marketplace. Inspired by the `awesome-design-md` approach: this file tells agents and implementers how the product should look, feel, and behave.

## Product Personality

BidCard TH is a trustworthy marketplace for collectible card buyers, casual bidders, and verified shops. The interface should feel premium but practical: fast to scan, clear about money, and calm enough for repeated buying and selling.

## Visual Principles

- Real marketplace first, marketing second. The first screen must show products, bids, wallet state, and seller actions.
- Dense but organized. Use compact panels, tables, filters, cards, and drawers instead of oversized hero sections.
- Money actions need high clarity. Top-up, bid, buy-now, and seller fees must use distinct visual states.
- Cards are collectible objects. Product images should feel glossy, physical, and valuable without using copyrighted characters.
- Thai copy should be short and operational. Labels beat explanations.

## Color Tokens

```css
--ink: #111827;
--muted: #64748b;
--canvas: #f7f3eb;
--surface: #fffdf8;
--surface-strong: #ffffff;
--line: #e8ded0;
--auction: #b42331;
--auction-dark: #7f1d1d;
--wallet: #0f766e;
--wallet-soft: #d7f4ef;
--bid: #f59e0b;
--bid-soft: #fff3c4;
--navy: #14213d;
--success: #15803d;
```

## Typography

- Font stack: `Sukhumvit Set`, `Segoe UI`, sans-serif.
- Local font files live in `assets/fonts/sukhumvit-set/` from `bluenex/baansuan_prannok`.
- Use tight, readable UI type. Do not use viewport-scaled font sizes.
- Section headings: 20-28px, 700 weight.
- Product names: 15-17px, 700 weight.
- Metadata, timers, and chip labels: 11-13px, 600 weight.
- Numeric prices can use tabular numbers and 700-800 weight.

## Layout System

- App shell: sticky top navigation, left filter rail, center product feed, right wallet/shop rail on desktop.
- Cards: 8px radius, thin border, subtle shadow, stable image ratio.
- Drawers/modals: right-side drawer for listing products, centered modal for top-up/register flows.
- Mobile: collapse rails into horizontal chips and stacked panels. Keep bid/buy actions visible on product cards.
- Spacing scale: 6, 10, 14, 18, 24, 32, 44.

## Components

### Top Navigation

- Brand mark: compact red/amber card glyph plus `BidCard TH`.
- Main tabs: ตลาด, ประมูลสด, ร้านค้า, กระเป๋าเงิน.
- Right actions: wallet balance, `เติมเงิน`, `สมัครร้านค้า`, `ลงสินค้า`.

### Product Card

- Image, rarity badge, mode badge (`ประมูล` or `ซื้อเลย`), countdown or stock status.
- Price hierarchy: current bid or buy-now price first, increment/fee below.
- Seller trust: shop name, rating, verified state.
- Primary button: `ใส่ราคา` for auctions, `ซื้อเลย` for buy-now.
- Secondary button: watchlist.

### Wallet Panel

- Current balance.
- Hold amount for active bids.
- Quick top-up chips: 500, 1,000, 2,000, 5,000 THB.
- Transaction list with top-up, bid hold, purchase, seller payout.

### Seller Tools

- Shop registration modal should ask for shop name, contact, payout method, and agreement.
- Listing drawer supports auction/sale mode, title, category, start price, buy-now price, duration, condition, image note, and submit.
- Seller dashboard shows listed items, active bids, sold value, and pending payout.

## Motion

- Hover cards lift 2px and reveal clearer action affordances.
- Drawer/modal transitions should be fast and restrained.
- Bid confirmation should update wallet hold and product current bid immediately.
- Avoid decorative ambient motion.

## Accessibility

- Buttons need visible focus rings.
- Color never carries status alone; use text labels and icons.
- Maintain readable contrast on auction red and wallet teal.
- Dialogs must be dismissible and preserve input state while open.

## Content Rules

- Use Thai labels for user-facing controls.
- Currency format: `฿12,500`.
- Countdown format: `02:14:33`.
- Use fictional card names and shops only.
- Never use copyrighted card brands, characters, or logos in generated assets.

## Key Screens

1. Marketplace feed with filters, wallet, and product grid.
2. Top-up wallet modal.
3. Shop registration modal.
4. Product listing drawer.
5. Seller dashboard panel.
6. Bid/buy confirmation state.

## Implementation Stack

- Next.js 15 App Router.
- TypeScript strict mode; avoid `any`.
- Tailwind CSS for styling.
- shadcn/ui primitives in `components/ui`.
- Business components in `components/shared`.
- Zod schemas in `lib/schemas.ts`.
- Local Sukhumvit Set font via `next/font/local`.
- Deployable as a standalone Node.js build for Node hosting.
