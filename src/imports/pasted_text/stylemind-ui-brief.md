StyleMind — Phased UI Implementation Brief for a Coding Agent
HOW TO USE THIS DOCUMENT (read this first)

This is a build roadmap derived from the full StyleMind product brief, broken into 8 phases (Phase 0–7).

Rules for using it:

Send the agent one phase at a time, not the whole document. The full scope is too large for a single pass — one giant prompt will produce shallow, inconsistent results across dozens of screens.
Always send Section 0 (Global Foundations) together with whichever phase you're currently running — it contains the tokens, principles, and mock data every phase depends on. Paste Section 0 + the phase you want in the same message.
Before Phase 0, fill in the Tech Stack block below to match your real project. A default is provided if you leave it blank.
After each phase, check the output against that phase's "Definition of Done" before moving on. If a phase is too big for your agent to finish in one go, split it at the sub-headings marked inside.
Keep the mock data built in Phase 0 and reuse it in every later phase — this is what makes screens feel like one coherent product instead of disconnected mockups.
SECTION 0 — GLOBAL FOUNDATIONS (send with every phase)
Tech Stack — EDIT BEFORE SENDING TO YOUR AGENT
Framework:      [ ] React + TypeScript   [ ] Next.js   [ ] Vue   [ ] Other: ______
Styling:        [ ] Tailwind CSS         [ ] CSS Modules   [ ] styled-components   [ ] Other: ______
State mgmt:     [ ] React Context        [ ] Zustand   [ ] Redux   [ ] Other: ______
Routing:        [ ] React Router         [ ] Next.js file-based routing   [ ] Other: ______

Folder convention:
  /components/ui/        → generic design-system primitives (Button, Input, Card, Toast...)
  /components/fashion/   → fashion-specific components (ColorSwatch, SizeSelector, OutfitCard...)
  /components/layout/    → nav bars, headers, footers, page shells
  /screens/ (or /pages/) → one folder per screen, grouped by phase
  /mock/                 → static JSON mock data (no real backend at this stage)

DEFAULT IF LEFT UNEDITED: React + TypeScript + Tailwind CSS + React Router + Context API for
cart/AI-session state. No backend — all data served from /mock JSON files.
Design Tokens

Colors

Token	Hex	Use
Warm Ivory	
#FAF8F5	Primary background
Soft Sand	
#EEE8E1	Secondary/section background
Charcoal (text)	
#222222	Primary text
Secondary Text	
#6F6B67	Captions, metadata
Deep Fashion Accent	
#684B5A	Primary brand color, primary buttons
Muted Rose Accent	
#B98791	Secondary accents, highlights
Soft Blush Surface	
#F4E7E8	Highlighted cards, AI surfaces
Success	
#48755A	Confirmations, in-stock, approved
Warning	
#B67A32	Pending states, low stock
Error	
#A94B4B	Errors, rejected, out of stock

These are a proposal, not a fixed requirement — adjust if the real project already has brand colors.

Typography

Display/heading: an elegant editorial serif (e.g. Fraunces, Playfair Display) for hero copy, section titles, outfit names.
Body/UI: a clean modern sans-serif (e.g. Inter) for everything functional — labels, prices, buttons, forms.
Hierarchy should read like a fashion magazine merged with a premium commerce app: confident large headings, generous line-height on body copy, never cramped.

Shape, spacing, motion

8px base spacing scale.
Rounded geometry used selectively (cards, buttons, chips) — not applied uniformly to every element.
Minimal borders; depth comes from soft shadows, not hard lines.
Strong whitespace over dense layouts.
Restrained gradients reserved only for AI-specific surfaces (AI Stylist, AI recommendation cards) so AI features read as distinct without looking like a crypto/dev-tool dashboard.
Micro-interactions should be subtle: swatch transitions, size-selection feedback, "item added" confirmations, AI "thinking" skeletons. Avoid excessive animation.
Non-Negotiable Product Principles (apply in every single phase)
Owned vs. Shop separation is sacred. Anywhere an outfit is shown (AI result, product detail, wardrobe, travel plan, 3D studio), visually separate "YOU ALREADY OWN" from "RECOMMENDED TO BUY." Never merge them into one undifferentiated list.
AI never invents purchasable products. Every "buy" item shown must map to a real mock catalog product + variant. If that variant becomes unavailable, show that explicitly (e.g. "Currently unavailable," "Size unavailable," "Find an alternative") — never let a stale recommendation look purchasable.
No body-judgment language, ever. Body measurement fields (bust/waist/hip) are optional, explained ("Helps StyleMind improve size and fit recommendations"), skippable, editable, and removable at any time. Never imply a body type is better or worse. Never guarantee an exact fit — use language like "may create a more relaxed fit based on your saved preferences," never "you have the wrong body shape."
No confirmed-but-unbuilt tech. Don't visually imply: photorealistic virtual try-on, automatic body scanning/computer-vision garment classification, automatic live weather or carrier integration, or a social feed — unless a phase explicitly labels it as a "future concept."
Status enums are never shown raw. Order/return/refund/payment states (PENDING, PAID, SHIPPED, etc.) must always be translated into plain, friendly copy plus a visual timeline — never a raw backend string.
SePay/VietQR has no "I already paid" button. The UI only ever reflects system-confirmed payment status (waiting / received / expired / failed). Never let the user self-report payment.
Accessibility baseline, every screen: color is never the only status signal (always pair with icon + text label); visible keyboard focus states; contrast meets WCAG AA; touch targets ≥44px; every input has a real label; validation messages are specific and human.
Responsive is intentional, not shrunk. Desktop favors editorial grids and split workspaces (e.g. AI Stylist's 3-column layout). Mobile favors single-column discovery, bottom sheets for filters, sticky primary actions, and compact cards — design mobile layouts on purpose, don't just resize desktop ones.
Shared Mock Data (build once in Phase 0, reuse everywhere after)

Build a small but internally consistent dataset so recommendations feel coherent across screens:

~15–20 catalog products across tops, bottoms, dresses, outerwear, shoes, bags, accessories. Each needs: id, brand, name, price, available colors, available sizes (with per-variant stock), material, style tags (e.g. "minimalist," "feminine," "casual"), 1–3 placeholder images, availability status.
~10–15 wardrobe items "owned" by the demo user, tagged by category/color/style — deliberately overlapping in palette with some catalog products (e.g. several neutral/warm-toned pieces) so AI outfit results can plausibly mix owned + shop items.
1 demo customer profile: style preferences, liked/disliked colors, favorite brands, budget range, common occasions, and a partially filled optional body profile (to let you demonstrate both the "complete" and "skip/incomplete" states).
2–3 sample orders in different states (e.g. one PROCESSING, one COMPLETED with an associated return, one PAYMENT_PENDING) so Phase 5 has real data to render against.
1 sample travel context (destination, duration, occasions) for Phase 6's Travel Planner.
PHASE 0 — Design System & Mock Data Foundation

🎯 Goal: Establish the reusable component library and shared mock data every later phase depends on. Nothing product-specific yet — this is the toolkit.

📦 Build:

Design tokens as code (CSS variables or Tailwind config) matching Section 0.
Base components: Button (Primary, Secondary, Ghost, Destructive, AI-action, Icon-only), Input (Text, Search, Password, OTP, Number, Currency, Select, Multi-select, Autocomplete), Card (generic shell used later for Product/Wardrobe/Outfit/Order cards), Toast, Inline validation states, Loading skeleton, Empty state, Dialog/Modal, Bottom Sheet, Drawer.
Fashion-specific inputs: Color swatch (with visible text label, never color-only), Size selector, Fit selector (Slim/Regular/Relaxed/Oversized), Brand selector, Style chips, Occasion chips, Budget range slider.
The mock data described above, as static JSON in /mock.
A simple internal "style guide" page that renders every component and token so you can visually QA the system before building real screens.

🏁 Definition of Done: every component in the list above renders correctly in both light desktop and mobile widths, uses only tokens (no hardcoded colors), and the style-guide page loads with no errors. Mock JSON files are structured and ready to import.