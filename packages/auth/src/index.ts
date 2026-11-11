import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { Database } from "@math/db";
import * as schema from "@math/db/schema/auth";
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";

export type AuthConfig = {
	BETTER_AUTH_URL: string;
	BETTER_AUTH_SECRET: string;
	CORS_ORIGIN: string;
};

export function createAuth(
	env: AuthConfig,
	database: Database,
	desktopOrigins: readonly string[] = [],
) {
	return betterAuth({
		database: drizzleAdapter(database, {
			provider: "sqlite",
			schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN, ...desktopOrigins],
		emailAndPassword: { enabled: true },
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "lax",
				secure: false,
				httpOnly: true,
			},
			cookiePrefix: "math",
			crossSubDomainCookies: { enabled: true, domain: "math-api.tajhans.com" },
		},
		plugins: [username({ displayUsername: false })],
	});
}

export type Session = ReturnType<typeof createAuth>["$Infer"]["Session"];
