/**
 * Generic REST envelope every backend endpoint responds with:
 * `{ success, message, data }`. Extracted out of `auth.types.ts` (where it
 * originally lived) once a second consumer needed it unchanged — the
 * packages/projects/quotations/payments modules added alongside this file —
 * per the architecture doc's promotion rule (design doc §1: "promoted to
 * shared the moment a second module needs it unchanged").
 */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}
