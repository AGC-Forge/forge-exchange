export default defineNuxtPlugin((nuxtApp) => {
  // const {
  //   isHydrated: isModelHydrated,
  //   hydrateFromLocalStorage: hydrateModelFromLocalStorage
  // } = useModelStore();

  nuxtApp.hook("app:mounted", () => {
    // if (!isModelHydrated) {
    //   hydrateModelFromLocalStorage();
    // }
    // window.addEventListener("resize", checkMobile);
    // window.addEventListener("keydown", handleKeydown);
    // console.log("useSidebarState", isHydrated.value);
  });
  // nuxtApp.hook("app:beforeMount", () => {
  // 	window.removeEventListener("resize", checkMobile);
  // 	window.removeEventListener("keydown", handleKeydown);
  // });
});
