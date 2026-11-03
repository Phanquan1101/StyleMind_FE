# EP06 Outfit Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Inline execution and the design are already approved.

**Goal:** Working per-Outfit sharing demo in the user-selected customer-commerce worktree.
**Architecture:** Reuse existing auth, persisted DemoDatabase, router, Outfit details and product cards. Friendship grants FRIENDS access; legacy email grants never do. Keep old records for compatibility, with no new email-sharing UI.
**Tech Stack:** Existing React / TypeScript / Router / Vitest; no dependencies.
**Spec:** E:/mss/du-an/StyleMind_FE/docs/superpowers/specs/2026-10-30-ep06-community-ui-design.md and the approved PRIVATE/FRIENDS/PUBLIC conversation rules.

## Global Constraints

- Edit only this worktree; no Git, commits, pushes or cloud calls. Use source snapshots as the baseline.
- PRIVATE default. Sending/accepting invitations never changes visibility. FRIENDS includes every current friend.
- Only owner changes visibility; draft + Cancel have no effects. Leaving PUBLIC retains token; returning reuses it.
- Preserve commerce / AI / builder behavior. Guest public page has no account details, owner actions, Friends or Chat navigation.
- Persist demo data, explicitly distinguish demo from connected API. No new backend/API/SMTP work in this slice.
- Keep legacy records. Existing public Outfit links remain. Legacy wardrobe public routes may display PUBLIC outfits only, never PRIVATE/FRIENDS.
- Chat conversion, invitation landing and real API connection remain separate next slices.

## Review Focus

1. Legacy email or wardrobe-public link must not reveal a PRIVATE/FRIENDS outfit.
2. Session switch, locked account or unfriend immediately removes FRIENDS read access.
3. Cancel/reopen must not save a stale visibility draft; copy errors must be visible.
4. PUBLIC off/on and reload preserve the same link without exposing inactive tokens.
5. Friend list counts, total and previews must only derive from visible outfits, with useful empty states.

## Task 1 — sharing model and compatibility

Files: entities/outfit/model/types.ts; app/store/types.ts, demoReducer.ts; features/sharing/model/outfitSharing.ts and tests; shareSelectors.ts.
Interfaces: `canReadOutfit(database, outfitId, viewerId): boolean`, `selectFriendOutfits(database, ownerId, viewerId): OutfitDetail[]`, `outfit/visibilityChanged {outfitId, visibility, publicToken?}`. Current session supplies actor to reducer.

- [x] Write model tests for private / friends / public matrix, legacy grants denied, locked/guest viewers, unfriend, owner-only mode, stable token and compatibility normalization (unknown mode private, no reset of commerce data).
- [x] Run focused tests; expected failures for absent sharing behavior.
- [x] Implement model / reducer / selectors with active customer checks, stable public token and no legacy grants.
- [x] Run focused tests; expected pass.

## Task 2 — owner sharing and friend read UI

Files: SharingFlow.test.tsx; OutfitSharingDialog.tsx; WardrobePage.tsx; OutfitDetailPage.tsx; OutfitCard.tsx; FriendsPage.tsx; sharing pages.
Interfaces: owner dialog consumes Outfit + native store. Friend pages consume `selectFriends` + `selectFriendOutfits`; readonly details use `canReadOutfit`.

- [x] Migrate obsolete email-sharing tests to approved per-Outfit rules. Add cancel/save/reload/stable token, guest public projection, legacy link filtering, readonly friend + unfriend tests.
- [x] Run UI tests; expected fail on old share UI/access behavior.
- [x] Add draft radio modal, explanatory copy, public URL/copy, per-Outfit badges; replace wardrobe email controls with per-Outfit guidance. Connect Friends → friend wardrobe and readonly details. Old access page explains retirement and links to new controls; no grant/restore buttons.
- [x] Run sharing/Friends/storage tests, typecheck and full suite; expected pass with only intentional legacy-sharing expectations changed.

## Task 3 — browser QA, review and handoff

- [x] Build; inspect actual correct-worktree server and desktop/mobile UI via computer-use skill.
- [x] One fresh-context final review, then one Important/Critical fix pass with failing regression tests.
- [x] Save report with exact verification, remaining API/Chat work and all rulings/deferred minors.

## Pre-flight / execution decisions

- Task 1 produces selectors consumed by Task 2: use account IDs internally; email wrapper exists only for existing call sites.
- Ruling: snapshots replace Git helpers/commits, and evidence is retained — explicit user preference; cost is manual integration later.
- Ruling: retain legacy wardrobe-public route but filter PUBLIC only — prevents old links bypassing per-Outfit visibility; cost is old viewers now see fewer items.
- Ruling: keep existing Chat behavior until its own migration; new Friends/Sharing UI adds no links into the old Chat permission model — avoids suggesting it is already migrated.

