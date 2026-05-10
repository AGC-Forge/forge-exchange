const ADMIN_ROUTES = ["/app/users", "/app/settings"];

export default defineNuxtRouteMiddleware(async (to, from) => {
  const { loggedIn, user, fetch, ready } = useUserSession();

  if (!ready.value) await fetch();

  if (!loggedIn.value) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }

  const isAdmin =
    user.value?.role.name === "admin" || user.value?.role.name === "superadmin";

  if (ADMIN_ROUTES.includes(to.path) && !isAdmin) {
    return navigateTo({
      path: "/app",
      query: { redirect: to.fullPath },
    });
  }
});
