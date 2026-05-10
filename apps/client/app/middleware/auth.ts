export default defineNuxtRouteMiddleware(async (to, from) => {
  const { loggedIn, fetch, ready } = useUserSession();

  if (!ready.value) await fetch();

  if (!loggedIn.value) {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});
