<script lang="ts" setup>
const platformIconItems = [
  {
    images: "/images/device/android.png",
    name: "Android",
    class: "pos-1",
  },
  {
    images: "/images/device/apple.png",
    name: "iPhone",
    class: "pos-2",
  },
  {
    images: "/images/device/windows.png",
    name: "Windows",
    class: "pos-3",
  },
  {
    images: "/images/device/linux.png",
    name: "Linux",
    class: "pos-4",
  },
  {
    images: "/images/device/ios.webp",
    name: "iOS",
    class: "pos-5",
  },
  {
    images: "/images/device/chrome.png",
    name: "Chrome",
    class: "pos-6",
  },
  {
    images: "/images/device/firefox.png",
    name: "Firefox",
    class: "pos-7",
  },
  {
    images: "/images/device/macos.png",
    name: "macOS",
    class: "pos-8",
  },
  {
    images: "/images/device/opera.png",
    name: "Opera",
    class: "pos-9",
  },
  {
    images: "/images/device/safari.png",
    name: "Safari",
    class: "pos-10",
  },
  {
    images: "/images/device/edge.png",
    name: "Edge",
    class: "pos-11",
  },
];
</script>

<template>
  <NuxtImg
    v-for="(item, index) in platformIconItems"
    :key="index"
    :src="item.images"
    :alt="item.name"
    :class="cn('absolute rounded-lg opacity-0 fade-in', item.class)"
  />
</template>
<style scoped>
.parallax-bg {
  height: 100vh;
  background: linear-gradient(45deg, #667eea, #764ba2);
  position: relative;
}
.fade-in {
  opacity: 0;
  animation: fadeInScale 9s ease-in infinite;
  animation-delay: var(--delay);
}
.pos-1 {
  --x: -100px;
  --y: -100px;
  --delay: 0s;
}
.pos-2 {
  --x: -100px;
  --y: 100px;
  --delay: 1s;
}
.pos-3 {
  --x: 100px;
  --y: -100px;
  --delay: 2s;
}
.pos-4 {
  --x: 100px;
  --y: 100px;
  --delay: 3s;
}
.pos-5 {
  --x: -100px;
  --y: -100px;
  --delay: 4s;
}
.pos-6 {
  --x: -100px;
  --y: 100px;
  --delay: 5s;
}
.pos-7 {
  --x: 100px;
  --y: -100px;
  --delay: 6s;
}
.pos-8 {
  --x: 100px;
  --y: 100px;
  --delay: 7s;
}
.pos-9 {
  --x: -100px;
  --y: -100px;
  --delay: 8s;
}
.pos-10 {
  --x: -100px;
  --y: 100px;
  --delay: 9s;
}
.pos-11 {
  --x: 100px;
  --y: -100px;
  --delay: 10s;
}
.pos-12 {
  --x: -100px;
  --y: -100px;
  --delay: 11s;
}
.pos-13 {
  --x: -100px;
  --y: 100px;
  --delay: 12s;
}
.pos-14 {
  --x: 100px;
  --y: -100px;
  --delay: 13s;
}
.pos-15 {
  --x: 100px;
  --y: 100px;
  --delay: 14s;
}
.pos-16 {
  --x: -100px;
  --y: -100px;
  --delay: 15s;
}
.custom-delay-1 {
  --delay: 0.3s;
}
.custom-delay-2 {
  --delay: 0.6s;
}
.custom-delay-3 {
  --delay: 0.9s;
}
.custom-delay-4 {
  --delay: 1.2s;
}
.custom-delay-5 {
  --delay: 1.5s;
}
.custom-delay-6 {
  --delay: 1.8s;
}
.custom-delay-7 {
  --delay: 2.1s;
}
.custom-delay-8 {
  --delay: 2.6s;
}
.custom-delay-9 {
  --delay: 3.1s;
}
.fade-up {
  animation: fadeUp 0.6s ease-in-out forwards;
  animation-delay: var(--delay);
}
@keyframes fadeUp {
  0% {
    opacity: 0;
    transform: translateY(50px);
  }
  70% {
    opacity: 1;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes fadeInScale {
  0% {
    opacity: 0;
    scale: 0;
  }
  50% {
    opacity: 0;
  }
  60% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  85% {
    opacity: 0;
  }
  to {
    opacity: 0;
    transform: scale(7) translate(var(--x), var(--y));
  }
}
@media (min-width: 1024px) {
  .fade-in {
    width: auto;
    height: 30px;
  }
}
@media (min-width: 768px) {
  .fade-in {
    width: auto;
    height: 30px;
  }
}
@media (min-width: 640px) {
  .fade-in {
    width: auto;
    height: 30px;
  }
}
@media (min-width: 480px) {
  .fade-in {
    width: auto;
    height: 30px;
  }
}
@media (min-width: 320px) {
  .fade-in {
    width: auto;
    height: 30px;
  }
}
</style>
