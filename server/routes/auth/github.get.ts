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
      user.name ||
      user.login ||
      (email ? email.split("@")[0] : "user");
    const avatar =
      user.avatar_url ||
      null;

    const result = await upsertOAuthUser({
      provider: "github",
      providerAccountId,
      email,
      name,
      avatar,
      tokens: {
        accessToken: tokens.access_token,
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
      provider: "github",
      loggedInAt: new Date(),
    });

    return sendRedirect(event, "/");
  },
  onError(event) {
    return sendRedirect(event, "/?auth=error");
  },
});
