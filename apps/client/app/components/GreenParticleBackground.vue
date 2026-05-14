<script setup lang="ts">
import { kebabCase } from "scule";

interface Particle {
  x: number;
  y: number;
  size: number;
  twinkleDelay: number;
  id: string;
  opacity: number;
}

const props = withDefaults(
  defineProps<{
    particleCount?: number;
    color?: string;
    size?: { min: number; max: number };
    speed?: "slow" | "normal" | "fast";
    gradientFrom?: string;
    gradientTo?: string;
  }>(),
  {
    particleCount: 60,
    color: "var(--ui-primary)",
    size: () => ({
      min: 1.5,
      max: 4,
    }),
    speed: "normal",
    gradientFrom: "transparent",
    gradientTo: "rgba(34, 197, 94, 0.15)", // hijau tipis
  },
);

const route = useRoute();

// Generate random particles dengan variasi opacity
const generateParticles = (count: number): Particle[] => {
  return Array.from({ length: count }, () => {
    const x = Math.floor(Math.random() * 100);
    const y = Math.floor(Math.random() * 100);
    const size =
      Math.random() * (props.size.max - props.size.min) + props.size.min;
    const twinkleDelay = Math.random() * 5;
    const opacity = Math.random() * 0.6 + 0.2; // variasi opacity 0.2 - 0.8

    return {
      x,
      y,
      size,
      twinkleDelay,
      opacity,
      id: Math.random().toString(36).substring(2, 9),
    };
  });
};

// Generate all particles
const particles = useState<Particle[]>(
  `${kebabCase(route.path)}-particles`,
  () => generateParticles(props.particleCount),
);

// Compute twinkle animation duration based on speed
const twinkleDuration = computed(() => {
  const speedMap: Record<string, string> = {
    slow: "4s",
    normal: "2.5s",
    fast: "1.5s",
  };
  return speedMap[props.speed];
});

// Re-generate particles on mount (optional)
onMounted(() => {
  particles.value = generateParticles(props.particleCount);
});
</script>

<template>
  <div
    class="absolute inset-0 pointer-events-none z-[-1] overflow-hidden"
    :style="{
      background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
    }"
  >
    <!-- Layer gradient tambahan untuk dark/light mode yang lebih smooth -->
    <div
      class="absolute inset-0 bg-linear-to-b from-transparent via-green-50/20 to-green-100/30 dark:via-green-950/20 dark:to-green-900/40 dark:from-transparent h-full w-full"
    />

    <!-- Particles -->
    <div
      v-for="particle in particles"
      :key="particle.id"
      class="particle absolute"
      :style="{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        transform: 'translate(-50%, -50%)',
        '--particle-size': `${particle.size}px`,
        '--particle-color': color,
        '--twinkle-delay': `${particle.twinkleDelay}s`,
        '--twinkle-duration': twinkleDuration,
        '--base-opacity': particle.opacity,
      }"
    />
  </div>
</template>

<style scoped>
.particle {
  width: var(--particle-size);
  height: var(--particle-size);
  background-color: var(--particle-color);
  border-radius: 50%;
  box-shadow: 0 0 calc(var(--particle-size) * 1.5) var(--particle-color);
  animation: twinkle var(--twinkle-duration) ease-in-out infinite;
  animation-delay: var(--twinkle-delay);
  will-change: opacity, transform;
}

@keyframes twinkle {
  0% {
    opacity: calc(var(--base-opacity) * 0.3);
    transform: scale(0.8);
  }
  50% {
    opacity: calc(var(--base-opacity) * 1.2);
    transform: scale(1);
  }
  100% {
    opacity: calc(var(--base-opacity) * 0.3);
    transform: scale(0.8);
  }
}

/* Efek tambahan: floating lambat */
@media (prefers-reduced-motion: no-preference) {
  .particle {
    animation:
      twinkle var(--twinkle-duration) ease-in-out infinite,
      float 8s ease-in-out infinite;
  }
}

@keyframes float {
  0%,
  100% {
    transform: translate(-50%, -50%) translateY(0px);
  }
  50% {
    transform: translate(-50%, -50%) translateY(-3px);
  }
}
</style>
