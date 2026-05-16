import { sendRedirect } from "h3";
import { serializeSubscription } from "~~/server/handler/auth";

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user, tokens }) {
    const providerAccountId = String(user.id);
    const email = user.email;
    const name = user.name || (email ? email.split("@")[0] : "user");
    const avatar = user.picture || user.avatar_url || null;

    const result = await upsertOAuthUser({
      provider: "google",
      providerAccountId,
      email,
      name,
      avatar,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        idToken: tokens.idToken,
      },
    });

    if (!result.user) throw new Error("User not found");

    await setUserSession(event, {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarUrl: result.user.avatarUrl,
        role_id: result.user.role_id,
        timezone: getTimezone(event).timezone,
        emailVerified: user.email_verified || false,
        emailVerifiedAt: result.user.emailVerifiedAt ?? new Date(),
        role: result.role,
        subscription: serializeSubscription(result.user.subscription ?? null),
      },
      provider: "google",
      loggedInAt: new Date().toISOString(),
    });

    return sendRedirect(event, "/app/billing");
  },
  onError(event, error) {
    const statusCode = (error as any)?.statusCode ?? 500
    const statusMessage = (error as any)?.statusMessage ?? 'OAuth Error'
    const message = (error as any)?.message ?? String(error)
    console.error('[OAuth google] error', { statusCode, statusMessage, message })
    return sendRedirect(event, "/?auth=error&provider=google");
  },
});
