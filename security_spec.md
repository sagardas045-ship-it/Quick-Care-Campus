# Security Specification: Quick Care Campus

## 1. Data Invariants
1. **Identity Binding:** A `users/{userId}` profile may only be read or written by the authenticated user whose `request.auth.uid == userId` (or an authorized admin).
2. **PII Isolation:** Phone numbers (`+91` WhatsApp), emails, and hostel room numbers are never readable via blanket `isSignedIn()` queries. Non-owners cannot `get` or `list` another student's profile or orders.
3. **Order Ownership & Immutability:** Every `orders/{orderId}` document must bind `studentUid == request.auth.uid` on creation. Financial fields (`subtotal`, `deliveryFee`, `totalPayable`, `handoverPin`, `items`) and `createdAt`/`studentUid` are immutable after creation.
4. **Terminal State Locking:** Once an order reaches `status == 'delivered'`, no further client updates are permitted (except explicit admin correction).
5. **Temporal Integrity:** `createdAt` and `updatedAt` must equal `request.time`.
6. **Privilege Escalation Prevention:** Clients cannot write to `admins/{id}` or `runners/{id}` unless already an admin.

## 2. Adversarial Payload Matrix (Dirty Dozen)
1. **Unauthenticated Profile Read:** Unauthenticated `get /users/u1` -> `PERMISSION_DENIED`.
2. **Cross-Student PII Read:** User B `get /users/userA` -> `PERMISSION_DENIED`.
3. **Blanket Order List Scrape:** User B `list /orders` without `studentUid == userB` filter -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Profile:** User A creates `/users/userA` with extra `{ isAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Invalid +91 Phone Format:** User A sets `phone: "12345"` -> `PERMISSION_DENIED` (regex guard).
6. **Identity Spoofing on Order Create:** User A creates `/orders/ord1` with `studentUid: "userB"` -> `PERMISSION_DENIED`.
7. **Price Tampering on Order Update:** User A updates `/orders/ord1` changing `totalPayable: 1` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(...)`).
8. **Handover PIN Tampering:** User A updates `handoverPin: "0000"` -> `PERMISSION_DENIED`.
9. **Post-Delivery Mutation:** User A updates `/orders/ord1` after `status == 'delivered'` -> `PERMISSION_DENIED`.
10. **Client Timestamp Spoofing:** User A creates `/orders/ord1` with backdated `createdAt` -> `PERMISSION_DENIED` (`== request.time`).
11. **Oversized ID Poisoning:** User A writes `/orders/<1500-char-id>` -> `PERMISSION_DENIED` (`isValidId` guard).
12. **Self-Assigned Runner Escalation:** User A writes `/runners/userA` -> `PERMISSION_DENIED`.
