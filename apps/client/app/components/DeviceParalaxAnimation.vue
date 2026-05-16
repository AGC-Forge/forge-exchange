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
