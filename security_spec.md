# Security Specification: Quick Care Campus

## 1. Data Invariants
1. **Identity Binding:** A `users/{userId}` profile may only be read or written by the authenticated user whose `request.auth.uid == userId` (or an authorized admin). Supports Google Sign-In (`email_verified == true`) and Firebase Phone Auth (`phone_number != null`).
2. **PII Isolation:** Phone numbers (`+91` WhatsApp), emails, and hostel room numbers are never readable via blanket `isSignedIn()` queries. Non-owners cannot `get` or `list` another student's profile or orders.
3. **Order Ownership & Immutability:** Every `orders/{orderId}` document must bind `studentUid == request.auth.uid` on creation. Financial fields (`subtotal`, `deliveryFee`, `totalPayable`, `handoverPin`, `items`) and `createdAt`/`studentUid` are immutable after creation.
4. **Catalog Inventory Control (`kits`):** All signed-in users may read `kits/{kitId}`, while only authorized admins (`isAdmin()`) may create, toggle `inStock`, or delete catalog kits.
5. **Terminal State Locking:** Once an order reaches `status == 'delivered'`, no further client updates are permitted on `orders/{orderId}`.
6. **Post-Delivery Feedback Integrity (`feedback/{orderId}`):** A student may create a 1–5 star rating and optional comment (`<= 300` chars) only once for an existing `orders/{orderId}` that belongs to them and has `status == 'delivered'`.
7. **Temporal Integrity:** `createdAt` and `updatedAt` must equal `request.time`.

## 2. Adversarial Payload Matrix (Dirty Dozen)
1. **Unauthenticated Profile Read:** Unauthenticated `get /users/u1` -> `PERMISSION_DENIED`.
2. **Cross-Student PII Read:** User B `get /users/userA` -> `PERMISSION_DENIED`.
3. **Blanket Order List Scrape:** User B `list /orders` without `studentUid == userB` filter -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Profile:** User A creates `/users/userA` with extra `{ isAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Invalid +91 Phone Format:** User A sets `phone: "12345"` -> `PERMISSION_DENIED` (regex guard).
6. **Identity Spoofing on Order Create:** User A creates `/orders/ord1` with `studentUid: "userB"` -> `PERMISSION_DENIED`.
7. **Price Tampering on Order Update:** User A updates `/orders/ord1` changing `totalPayable: 1` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(...)`).
8. **Student Catalog Tampering:** Student A updates `/kits/kit-fever-flu` setting `price: 1` or `inStock: false` -> `PERMISSION_DENIED` (`isAdmin()` required).
9. **Post-Delivery Mutation:** User A updates `/orders/ord1` after `status == 'delivered'` -> `PERMISSION_DENIED`.
10. **Premature or Cross-User Feedback Injection:** User A creates `/feedback/ord1` while `ord1.status != 'delivered'` or for another student's order, or with `rating: 6` -> `PERMISSION_DENIED`.
11. **Oversized ID Poisoning:** User A writes `/orders/<1500-char-id>` -> `PERMISSION_DENIED` (`isValidId` guard).
12. **Self-Assigned Admin Escalation:** User A writes `/admins/userA` -> `PERMISSION_DENIED`.
