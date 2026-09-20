/**
 * Local email/password (this app's Better Auth DB — not the broker).
 *
 * On unless `VITE_FOLIO_EMAIL_PASSWORD=false` at build time. Self-host images
 * set it to true; live preview leaves it unset, which also keeps the form on
 * so visitors can register.
 *
 * Do NOT edit `server.ts` for this — that file is frozen pre-wired config.
 */
export const emailAndPasswordEnabled = import.meta.env?.VITE_FOLIO_EMAIL_PASSWORD !== "false";
