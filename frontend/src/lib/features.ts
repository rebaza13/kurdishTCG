/**
 * Feature switches. "Pay with FIB" stays off until FIB approves production
 * credentials — flip it on by setting NEXT_PUBLIC_FIB_ENABLED=true (no code
 * change). Read on both the client (checkout page) and the server (/api/checkout).
 */
export const FIB_ENABLED = process.env.NEXT_PUBLIC_FIB_ENABLED === "true";
