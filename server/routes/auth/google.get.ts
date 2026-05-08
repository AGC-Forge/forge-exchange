import { sendRedirect } from "h3";
import { upsertOAuthUser } from "../../utils/auth";

export default defineOAuthGoogleEventHandler({
  config: {
    emailRequired: true,
  },
  async onSuccess(event, { user, tokens }) {
    const providerAccountId = String(user.id);
    const email = user.email;
    const name =
      user.name ||
      (email ? email.split("@")[0] : "user");
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

    await setUserSession(event, {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatar: result.user.avatar,
        roleId: result.user.role_id,
      },
      provider: "google",
      loggedInAt: new Date(),
    });

    return sendRedirect(event, "/");
  },
  onError(event) {
    return sendRedirect(event, "/?auth=error");
  },
});
