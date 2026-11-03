# EP06 Friends — correct worktree implementation plan

> **For agentic workers:** Use superpowers:executing-plans, native sequential execution, then one final review. User already approved this execution method and corrected the target worktree.

**Goal:** Complete Friends/invitation UI and demo state in `stylemind-customer-commerce`; Sharing/Chat migration remains next slice.
**Architecture:** React Router routes and current auth user; extend existing DemoDatabase/reducer with friendships/invitations. Reuse shared Button/Modal. No parallel CommunityProvider, fixed viewer or duplicate Outfit collection.
**Tech:** Existing React/Router/Vitest/Testing Library, no new packages.
**Spec:** Owner decisions in this conversation: Friends page, pending successful send cannot repeat, retry failed/unknown/expired after30s, 7-day expiry, incoming Accept only, unfriend invalidates pair invitations, invitations never alter Outfit visibility. Prior UI design at `E:/mss/du-an/StyleMind_FE/docs/superpowers/specs/2026-10-30-ep06-community-ui-design.md`; architecture here supersedes its old AppState mounting.

## Constraints and rulings

- Correct cwd only; no Git/commit/push. Existing user authorization covers sequential execution; no repeat approval.
- UI demo only. Existing auth has no emailVerified fact; never claim verified-email acceptance or SMTP delivery. Display a demo notice and do not send mail.
- Preserve persisted schema1 data: normalize missing arrays to empty; never infer Friendship from legacy email grants or reset carts/orders.
- Current UI-sharing/chat grants remain unchanged in this slice; clearly mark their migration pending, do not add Friends card links into those old permission flows.
- Copy/reuse logic and styling ideas only from wrong-root prototype; do not overwrite App/main/router with old architecture. Wrong-root cleanup deferred until transferred work is verified.
- Evidence/snapshots at `E:/mss/du-an/.superpowers/implementation/ep06-friends-worktree`; preserve on completion because no commits are made.

## Task 1 — model and backwards-compatible store

Files: entities/friendship/model/types.ts; features/friends/model/friendshipModel.ts + test; app/store/types.ts, demoReducer.ts; app/data/demoSeed.ts; shared/storage/demoStorage.test.ts only if needed.
Interfaces: Friendship userAId/userBId; FriendInvitation senderId/recipientEmail/status/delivery/expiry; selectFriends(database,userId), validateInvitation(database,email,now), retrySeconds(invitation,now), reduceFriends(database,action). Actions use current session identity; no caller-selected actor.
- [x] Tests first: duplicate/self/friend/opposite pending, current recipient acceptance, wrong recipient, expiry,30s retry, unfriend invalidation, no Outfit changes, legacy storage preservation.
- [x] Observe RED, implement, run focused tests GREEN.

## Task 2 — native routed UI

Files: features/friends/pages/FriendsPage.tsx, FriendsFlow.test.tsx; app/router/routes.ts, AppRouter.tsx; app/layouts/components/CustomerHeader.tsx, MobileNavigation.tsx. Friends component uses existing store/auth/shared primitives.
- [x] Tests first: protected /friends, send/duplicate/accept/remove with confirmation, reload persistence and navigation.
- [x] Friends/Received/Sent controls, accessible labels/search/empty/status/retry controls and explicit demo copy; no fake Chat/ViewOutfit actions until those migrate.
- [x] Desktop nav Friends and mobile reachable link without squeezing seven bottom items; retain existing navigation destinations.
- [x] Run focused tests, full suite, typecheck/build; browser actual worktree when possible.

## Review focus

1. Account switch must not expose another user's outgoing invitations or mutate their pair.
2. Expired/failed/unknown retry30s, successful pending never resend; no contradictory duplicate toast.
3. Unfriend invalidates both directions; accepting invitation never changes old sharing/Outfits.
4. Existing schema1 localStorage loads without reset or implicit friend grants.
5. Modal keyboard and narrow header/nav remain usable; only link to implemented routes.

## Handoff

Record exact commands and partial scope. One fresh reviewer of this slice, fixes with regression tests. Next slice migrates Sharing and Messages to Friendship, adds floating Chat/images/invitation landing, integrates APIs later. No backend acceptance claim.

