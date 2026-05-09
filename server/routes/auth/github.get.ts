import { sendRedirect } from "h3";
import { upsertOAuthUser } from "../../utils/auth";

export default defineOAuthGitHubEventHandler({
  config: {
    emailRequired: true,
    scope: ["read:user", "user:email"],
  },
  async onSuccess(event, { user, tokens }) {
    const providerAccountId = String(user.id);
    const email = user.email;
    const name =
      user.name || user.login || (email ? email.split("@")[0] : "user");
    const avatar = user.avatar_url || null;

    if (!email || !name) throw new Error("Email or name is required");

    const result = await upsertOAuthUser({
      provider: "github",
      providerAccountId,
      email,
      name,
      avatar,
      tokens: {
        accessToken: tokens.access_token,
        tokenType: tokens.token_type,
        scope: tokens.scope,
      },
    });

    if (!result.user) throw new Error("User not found");
    // OAuth users are email-verified via provider
    await setUserSession(event, {
      user: {
        id: result.user?.id,
        email: result.user?.email,
        name: result.user?.name,
        avatarUrl: result.user?.avatarUrl,
        role_id: result.user?.role_id || "",
        timezone: getTimezone(event).timezone,
        emailVerified: user.email_verified || false,
        emailVerifiedAt: user.email_verified
          ? new Date()
          : (result.user.emailVerifiedAt ?? new Date()),
        role: result.role,
        subscription: result.user.subscription ?? null,
      },
      provider: "github",
      loggedInAt: new Date().toISOString(),
    });

    return sendRedirect(event, "/");
  },
  onError(event) {
    return sendRedirect(event, "/?auth=error");
  },
});
