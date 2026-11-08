import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Auth0 turns on automatically once these env vars exist (.env.local / Vercel).
// Without them the app runs in guest-only mode, so nobody's local build breaks.
export const authEnabled = Boolean(
  process.env.AUTH0_DOMAIN &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_SECRET,
);

export const auth0 = authEnabled
  ? new Auth0Client({
      signInReturnToPath: "/plan",
      authorizationParameters: { scope: "openid profile email" },
    })
  : null;
