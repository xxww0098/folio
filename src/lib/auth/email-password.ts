/**
 * Local email/password sign-in (this app's Better Auth DB — not the broker).
 *
 * Off unless `VITE_FOLIO_EMAIL_PASSWORD=true` at build time (Docker / self-host).
 * Live preview keeps the default off and uses the existing federated buttons.
 *
 * Self-host is a single owner account: Docker first boot creates it
 * (`scripts/ensure-admin.mjs`). The login page is sign-in only — no public signup.
 *
 * Do NOT edit `server.ts` for this — that file is frozen pre-wired config.
 */
export const emailAndPasswordEnabled = import.meta.env.VITE_FOLIO_EMAIL_PASSWORD === "true";
