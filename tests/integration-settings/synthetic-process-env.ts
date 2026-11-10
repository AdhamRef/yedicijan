/** Synthetic, structurally complete environment for tests; no real credentials or database. */
export function syntheticProcessEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    DATABASE_URL: "mongodb://127.0.0.1:27017/yedi_test_never_connected",
    GOOGLE_CLIENT_ID: "synthetic-google-id",
    GOOGLE_CLIENT_SECRET: "synthetic-google-secret",
    FACEBOOK_CLIENT_ID: "synthetic-facebook-id",
    FACEBOOK_CLIENT_SECRET: "synthetic-facebook-secret",
    ...overrides,
  };
}
