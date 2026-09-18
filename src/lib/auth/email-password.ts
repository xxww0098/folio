/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Off unless `VITE_FOLIO_EMAIL_PASSWORD=true` at build time (Docker / self-host).
 * Live preview keeps the default off and uses the existing federated buttons.
 *
 * Do NOT edit `server.ts` for this — that file is frozen pre-wired config.
 */
export const emailAndPasswordEnabled = import.meta.env.VITE_FOLIO_EMAIL_PASSWORD === "true";
