<script lang="ts" setup>
const colorMode = useColorMode();
const isAnimating = ref(false);

onMounted(() => {
  // const link = document.createElement("link");
  // link.rel = "preload";
  // link.as = "style";
  // link.href = "/css/main.css";
  // document.head.appendChild(link);
});

const nextTheme = computed(() =>
  colorMode.value === "dark" ? "light" : "dark",
);

const switchTheme = () => {
  colorMode.preference = nextTheme.value;

  localStorage.setItem("theme", nextTheme.value);
};

const startViewTransition = async (event: MouseEvent) => {
  if (isAnimating.value) return;
  isAnimating.value = true;

  if (!document.startViewTransition) {
    switchTheme();
    isAnimating.value = false;
    return;
  }

  const x = event.clientX;
  const y = event.clientY;
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  await new Promise(requestAnimationFrame);

  const transition = document.startViewTransition(() => {
    switchTheme();
  });

  await transition.ready;

  const keyframes = [
    { clipPath: `circle(0% at ${x}px ${y}px)` },
    { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` },
  ];

  const options: KeyframeAnimationOptions = {
    duration: 450,
    easing: "cubic-bezier(0.34, 1.2, 0.64, 1)",
    pseudoElement: "::view-transition-new(root)",
    fill: "forwards",
  };

  const animation = document.documentElement.animate(keyframes, options);

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (prefersReducedMotion) {
    animation.cancel();
    transition.skipTransition();
  }

  await animation.finished;
  isAnimating.value = false;
};

onUnmounted(() => {
  isAnimating.value = false;
});
</script>

<template>
  <UButton
    variant="ghost"
    :class="[
      'rounded-full shadow-md p-0.5 transition-colors duration-150',
      colorMode.preference === 'dark' ? 'text-yellow-500' : 'text-sky-600',
      isAnimating && 'pointer-events-none opacity-50',
    ]"
    size="md"
    :disabled="isAnimating"
    @click="startViewTransition"
  >
    <UIcon
      :name="
        colorMode.preference === 'dark'
          ? 'line-md:moon-filled-to-sunny-filled-loop-transition'
          : 'line-md:moon-filled-alt-loop'
      "
      class="transition-transform duration-300 hover:scale-110"
    />
  </UButton>
</template>

<style scoped>
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

::view-transition {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}
html {
  transition:
    background-color 0.3s ease,
    color 0.2s ease;
}
.dark-theme-transitioning * {
  transition: none !important;
}
</style>
