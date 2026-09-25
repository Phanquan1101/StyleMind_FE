# StyleMind Non-Wardrobe Demo Design

**Date:** 2026-09-25  
**Status:** Approved in conversation; pending written-spec review  
**Scope:** Frontend demo with mock data for all customer and admin features outside the AI Wardrobe domain

## 1. Objective

Build a complete, interactive StyleMind frontend demo using mock data. The demo must support realistic customer and admin workflows, persist changes across page reloads, and reorganize the repository into a feature-first structure.

The AI Wardrobe, outfit generation, and wardrobe-aware AI Stylist behavior are explicitly deferred. Existing wardrobe-related screens may be moved to the new structure to keep routing operational, but their behavior must not be expanded during this phase.

All source-code identifiers, file names, folder names, routes, model values, storage keys, and developer documentation remain in English. All user-facing content is Vietnamese, including labels, navigation, validation, notifications, statuses, mock content, dates, and currency formatting.

## 2. Product Scope

### Included customer features

- Authentication: login, registration, OTP verification, forgot password, and reset password.
- Home page with shopping and AI Wardrobe positioning.
- Product search, sorting, desktop filters, and mobile filter sheet.
- Product detail with color-specific galleries, size, quantity, add-to-cart, and buy-now actions.
- Cart with quantity controls, removal confirmation, discount, shipping, totals, and empty state.
- Checkout with address selection, address creation, order review, COD, VietQR, and order creation.
- QR payment with countdown, pending, expired, verification, and success states.
- Order list, order detail, timeline, cancellation request, return request, and refund tracking.
- Profile, address management, notifications, password change, logout, and demo-data reset.
- Responsive desktop, tablet, and mobile layouts.

### Included admin features

- Admin dashboard and AI analytics dashboard.
- User management.
- Category management.
- Product, variant, inventory, and color-specific image management.
- Order management.
- Cancellation request processing.
- Return and refund processing.
- AI fashion metadata and compatibility-rule management.
- Demo-data reset with destructive confirmation.

### Deferred features

- Creating, editing, deleting, regenerating, or restyling wardrobes.
- Generating outfits from wardrobes.
- Wardrobe-context AI Stylist behavior.
- Buying products directly from generated wardrobes or outfits.

### Removed from the active application

- Travel Planner.
- Visual Studio.
- Shoes, bags, jewelry, hats, and other accessories.

Travel Planner and Visual Studio source files may remain temporarily under `src/legacy`, but they must have no active route or navigation entry.

## 3. Architecture

Use a pragmatic feature-first architecture. React Router provides URL routing and route guards. React Context plus typed reducers provides application state without introducing a general-purpose state library. Mock repositories isolate persistence and asynchronous behavior from UI components.

```text
src/
  app/
    router/
    layouts/
    providers/
    styles/

  features/
    auth/
    catalog/
    cart/
    checkout/
    orders/
    profile/
    notifications/
    admin/
    wardrobe/

  entities/
    product/
    cart/
    order/
    user/
    address/
    notification/

  shared/
    ui/
    hooks/
    lib/
    storage/
    constants/
    types/

  legacy/
    travel/
    visual-studio/
```

Each feature follows this shape when the directories are needed:

```text
features/catalog/
  pages/
  components/
  model/
  data/
  types/
  index.ts
```

- `pages` contains route-level composition.
- `components` contains UI private to the feature.
- `model` contains reducers, actions, selectors, hooks, and domain rules.
- `data` contains mock repositories and feature seed data.
- `entities` contains reusable domain types and domain-focused UI.
- `shared` contains generic UI, hooks, formatters, storage utilities, constants, and shared types.
- Each feature exposes a public API through `index.ts`; consumers must not rely on internal deep imports.
- Internal imports use the existing `@/` alias.

`App.tsx` becomes a small application entry that mounts providers and the router. Navigation, data mutation, and domain behavior must not remain centralized in `App.tsx`.

## 4. Routing and Access Control

Routes use stable English paths while rendered labels remain Vietnamese.

```text
/
├── /login
├── /register
├── /verify-otp
├── /forgot-password
├── /reset-password
├── /shop
├── /products/:productId
├── /cart
├── /checkout
├── /checkout/qr
├── /order-success/:orderId
├── /orders
├── /orders/:orderId
├── /account/*
├── /notifications
├── /ai-wardrobe
├── /wardrobes
└── /admin/*
```

- Public routes include home, authentication, shop, product detail, and cart.
- `AuthGuard` protects checkout, orders, account, and notifications.
- `AdminGuard` protects every `/admin/*` route.
- Customer and admin use the same login page. Successful login redirects by role.
- Signed-in users who visit an authentication page are redirected to their appropriate home area.
- Unknown routes render a Vietnamese 404 page with a clear route back.
- The customer header has no direct Admin shortcut. Admin access is determined by the authenticated role.

## 5. State, Persistence, and Mock Repositories

`DemoStoreProvider` owns a typed, normalized demo database and dispatches domain actions through reducers. UI-only state such as open modals, active filters, form drafts, and loading indicators remains local to the relevant feature.

Persisted data includes:

- Users, credentials for demo accounts, roles, and user statuses.
- Current authenticated session and remember-me preference.
- Products, categories, variants, inventory, and images by color.
- Cart lines and discount state.
- Addresses and default-address selection.
- Orders, cancellation requests, return requests, and refund states.
- Notifications and read state.
- Admin-managed fashion metadata and compatibility rules.
- AI analytics seed values required by the admin dashboard.

The local database uses an English storage key and explicit `schemaVersion`. Startup behavior is:

1. Read the stored database.
2. Validate its version and required top-level shape.
3. Migrate supported older versions.
4. Replace invalid or unsupported data with the current seed.
5. Notify the user when recovery changed their stored demo data.

Mock repositories return promises with short deterministic latency so skeletons and pending states are observable. They must not inject random failures during demos. Expected failures come from validation and invalid state transitions.

Cross-feature actions operate on the same store. For example, approving a cancellation in Admin updates the customer order and creates a customer notification. Placing an order clears purchased cart lines and creates the order, timeline, and confirmation notification atomically.

The reset action requires confirmation, replaces all persisted data with the current seed, and restores the appropriate login state.

## 6. Customer Experience

### Authentication

- Login supports email, password, show/hide password, remember me, and role-based redirect.
- Registration collects full name, email, password, and confirmation, then enters OTP verification.
- OTP and password-recovery flows use deterministic demo codes displayed in a discreet demo-helper panel.
- Validation is inline and uses Vietnamese copy.
- Session state persists according to remember-me behavior.

### Home and navigation

- The desktop navigation contains `Trang chủ`, `Cửa hàng`, `AI Wardrobe`, and `Tủ đồ của tôi`.
- Search, notifications, cart, and account remain easy to access.
- Mobile navigation prioritizes Home, Shop, AI Wardrobe, Wardrobes, and Cart/Account according to available space.
- Home introduces both fashion shopping and AI Wardrobe. Wardrobe calls to action lead to the existing deferred experience.

### Catalog and product detail

- The active categories are tops, pants, skirts, dresses, and outerwear.
- Search covers product name, category, style, occasion, material, and tags.
- Filters include category, price, color, size, style, and occasion.
- Desktop uses a filter sidebar; mobile uses a bottom sheet with apply and clear actions.
- Product cards show image, Vietnamese name, price, colors, and optional category/style context.
- Product detail shows metadata, color-specific image galleries, size, quantity, stock feedback, add to cart, and buy now.
- Buy now creates or updates the selected cart line and takes the user directly to checkout.

### Cart and checkout

- Cart supports quantity changes, removal confirmation, discounts, shipping, totals, and an empty state.
- Checkout displays the selected address, order lines, payment method, discounts, and totals.
- Users can select an existing address or add a valid address without leaving checkout.
- COD creates the order immediately.
- VietQR opens the QR flow with amount, transfer content, instructions, and countdown.
- `Tôi đã thanh toán` enters a deterministic verification state before success.
- Expired QR sessions can be regenerated without duplicating an order.
- Order success displays order ID, total, payment method, view-order, and continue-shopping actions.

### Orders and service requests

- Order list supports empty and populated states.
- Order detail shows status, payment status, products, variants, address, totals, and timeline.
- Allowed status transitions are defined in the order model rather than duplicated in UI components.
- Eligible orders can submit a cancellation reason. The resulting request is visible to Admin.
- Completed eligible orders can submit return requests for selected products and quantities.
- Return evidence files are previewed in memory. Persistence stores only safe metadata such as file name and type, not binary contents or object URLs.
- Customer-visible request statuses include submitted, reviewing, approved, rejected, and refunded.

### Account and notifications

- Account areas include profile, addresses, orders, notifications, password change, logout, and reset demo data.
- Address management supports add, edit, delete, set default, validation, and destructive confirmation.
- Notification bell shows unread count and a compact dropdown.
- The notification page supports read-one and read-all behavior, timestamps, types, and empty state.

## 7. Admin Experience

Admin uses a work-focused layout with a dedicated sidebar, top bar, search where useful, notifications, and administrator profile.

### Dashboard and analytics

- Dashboard KPIs show total users, products, orders, and revenue.
- Charts summarize order volume, revenue, order statuses, payment methods, and returns/refunds.
- AI analytics shows seeded totals for wardrobes, generated outfits, popular styles, AI cart additions, and AI-attributed orders.
- Analytics values derive from current demo data when possible; metrics that depend on deferred wardrobe behavior use clearly defined seed fields.

### Users and categories

- User management supports search, role/status filtering, detail view, and account lock/unlock.
- The signed-in administrator cannot lock their own account.
- Category management uses a clothing-only tree/table and supports add, edit, activate, and deactivate.
- Category deactivation does not silently delete products.

### Products, variants, and images

- Product list supports search, filters, status, view, edit, activate/deactivate, and create.
- Product forms separate basic information, fashion metadata, variants, inventory, and images.
- Variants support color, size, optional price override, stock, and status.
- Each color owns a separate ordered gallery with one main image.
- Admin can add an image URL, preview a selected local file for the current session, set the main image, remove an image, and reorder images.
- Persisted local uploads retain metadata only; persistent demo images use URLs.

### Orders, cancellations, and returns

- Order management supports search, filters, detail view, payment state, and valid status changes.
- Cancellation requests can be approved or rejected with an optional admin note.
- Approval updates the order, request, and customer notification in one action.
- Return requests show product, quantity, description, and available evidence metadata.
- Admin can review, approve, reject, and process a simulated refund when allowed.

### AI management

- Styles and occasions support list, add, edit, activate, and deactivate.
- Fashion metadata covers pattern, fit, material, and color.
- Compatibility rules cover clothing type, color, style, and occasion compatibility.
- These settings are stored for future wardrobe work but do not alter deferred wardrobe behavior in this phase.

## 8. Interaction, Validation, and Error Handling

- No feature uses `window.alert()` or `window.confirm()`.
- Forms show Vietnamese field-level validation and a clear submission-level error when needed.
- Destructive actions use a consistent confirmation dialog and destructive button style.
- Successful mutations produce concise toast feedback and update dependent screens immediately.
- Loading states use layout-matched skeletons instead of generic blocking spinners where practical.
- Empty states exist for cart, orders, notifications, search results, products, requests, and other list views.
- Storage corruption and unsupported schema versions recover safely to seed data.
- Duplicate emails, invalid credentials, unavailable stock, invalid order transitions, and expired payments return deterministic domain errors.
- Focus management, keyboard navigation, visible focus rings, semantic landmarks, accessible labels, and adequate color contrast are required.

## 9. Visual and Responsive Direction

- Preserve StyleMind's feminine, premium, youthful identity while improving consistency.
- Continue using the existing Fraunces and DM Sans pairing unless implementation reveals a technical issue.
- Product imagery remains the visual priority.
- Customer screens use generous whitespace and editorial hierarchy.
- Admin screens use denser, quieter layouts optimized for scanning and repeated actions.
- Cards use restrained radii and are reserved for products, list records, modals, and framed tools rather than every page section.
- Desktop, tablet, and mobile layouts are designed intentionally. Mobile filters use a sheet, actions may become sticky, tables become structured lists, and dialogs fit the viewport without clipped controls.
- UI text must fit controls at supported widths without overlap.

## 10. Implementation Sequence

1. Add application routing, layouts, providers, route guards, demo store, persistence, and storage recovery.
2. Move shared UI and domain entities into the new structure and establish feature public APIs.
3. Implement authentication, home, catalog, product detail, cart, and checkout.
4. Implement orders, profile, addresses, notifications, cancellation, and return flows.
5. Implement the complete admin area.
6. Move existing wardrobe code into its feature boundary without expanding behavior.
7. Move Travel Planner and Visual Studio to `legacy`, remove active routes, and remove obsolete duplicate screens.
8. Complete responsive, accessibility, automated, build, and visual verification.

Compatibility re-exports may be used temporarily during migration, but final active imports must point to feature public APIs. Existing user changes outside this scope must be preserved.

## 11. Testing Strategy

Add Vitest and React Testing Library to the project and define a `test` script.

Automated coverage focuses on:

- Storage initialization, schema validation, migration, recovery, persistence, and reset.
- Authentication and role-based routing.
- Catalog search/filter behavior and color-specific product galleries.
- Cart line merging, quantity limits, discounts, shipping, and totals.
- COD and VietQR checkout transitions, payment expiry, and duplicate-order prevention.
- Order-status transition rules.
- Cancellation, return, refund, and notification cross-feature updates.
- Address validation and default-address invariants.
- Admin product/category/user mutations and guard rules.

Verification includes:

- TypeScript checking through the production build.
- Full automated test suite.
- Direct navigation and reload checks for all routes.
- Customer and Admin end-to-end smoke flows using seeded accounts.
- Visual checks at representative desktop, tablet, and mobile widths.
- A scan for active English user-facing copy, removed-scope navigation, `alert()` calls, dead routes, and obsolete imports.

## 12. Completion Criteria

The phase is complete when:

- All active customer and admin UI copy is Vietnamese.
- Source-code naming and routes remain English.
- Every in-scope screen has a real URL and survives reload correctly.
- All in-scope customer and admin controls perform a meaningful demo action.
- Customer and Admin operate on the same persisted mock database.
- Travel Planner, Visual Studio, shoes, bags, and accessories are absent from the active app.
- Wardrobe behavior has not been expanded.
- Responsive layouts work at desktop, tablet, and mobile widths without overlap.
- Automated tests and the production build pass.
- The repository uses the approved feature-first structure and no longer depends on the monolithic `App.tsx` screen switcher.

