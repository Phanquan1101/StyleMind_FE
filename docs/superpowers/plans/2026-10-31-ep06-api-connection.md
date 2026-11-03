# EP06 API connection plan

> **For agentic workers:** Use superpowers:executing-plans; user chose inline execution. No Git commands or commits.

**Goal:** Connect minimal real Identity sign-in, Friends/invitations and per-Outfit sharing through Gateway in the relocated FE.
**Architecture:** Opt-in `VITE_COMMUNITY_MODE=api`, demo default. A session provider holds a real access token separately from DemoDatabase; strict HTTP client handles status and session expiry. Live pages use backend UUIDs/DTOs and server authorization; demo pages retain their own data. Native auth guards/header share current auth facade.
**Spec:** Approved community design/conversation: minimal existing login + Identity, JWT/Gateway, no fake IDs; PRIVATE/FRIENDS/PUBLIC and invitation rules already approved. Concrete controller/DTO source in E:/mss/du-an/BE/StyleMind_BE is the wire contract.

## Constraints and decisions

- User says backend is not running. Verify HTTP contracts with controlled fetch responses and browser failure handling; report live E2E pending.
- No backend/schema/cloud changes, no real email sends, no secret reads, no dependencies. API keys never belong in Vite env.
- Access token lives in sessionStorage only; password and refresh token are not persisted. On expiry/401 require sign-in again in this first integration slice. Hide remember/demo credentials on real sign-in.
- Login: POST /identity/api/v1/auth/login with email/password only; GET /identity/api/v1/me. JWT roles only choose presentation; server authorizes every request.
- Native demo builders/AI/Commerce are outside API connection scope. Live wardrobe lists real stored outfits and sharing controls, no calls with mock variants or local demo creations.
- No optimistic success or automatic retry of email/mutations. Outgoing list lacks delivery/cooldown metadata: offer expired resend; failed/unknown action responses can offer retry only from server metadata. Do not infer SMTP delivery from PENDING.
- Scope after this slice: Chat/UI/WebSocket/images, invitation link landing, refresh-token lifecycle and real registration/OTP integration.

## Review focus

1. Token must only go to configured Gateway paths, never media URLs or logs.
2. Session changes/unmount and stale HTTP responses must not restore previous-user data.
3. HTTP/network errors must never fall back to demo or announce success.
4. Backend count/pagination, nullable display names and metadata-only unavailable items must render correctly.
5. Mode changes and invitation retries use exact backend DTO/body, keep old public token, no automatic sends.

## Tasks

- [ ] Transport/DTO client: tests RED for exact routes/bodies, bearer/no-bearer public, 204, sanitized problem details, invalid UUID and expired session; implement and GREEN.
- [ ] Minimal API auth + opt-in mode/guards/login: test real login/profile, failure and logout/401; session tokens separate from demo, Gateway Vite proxy configured explicitly.
- [ ] Friends live page: page navigation, incoming/outgoing, send/accept/unfriend, loading/error/retry states; server action outcome and cooldown, no local friendship reducer calls.
- [ ] Live owner/friend/public Outfit views + sharing controls: real IDs/DTOs, explicit save/cancel and refresh server state; read-only viewer projection and no fake product/cart actions.
- [ ] Run focused + full test suite, typecheck/build; browser smoke; one independent final review, one Important fix pass, handoff doc and remaining live-E2E checklist.

Global compatibility: existing 140 demo tests form baseline; API mode tests explicitly enable API config, reset session storage and mock fetch at HTTP boundary. Keep evidence/snapshots instead of Git helpers.
