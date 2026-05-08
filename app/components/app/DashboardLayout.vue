<script setup lang="ts">
import type { ClassNameValue } from "tailwind-merge";
import type { HTMLAttributes } from "vue";

const props = withDefaults(
  defineProps<{
    id?: string;
    title?: string;
    root?: ClassNameValue;
    body?: ClassNameValue;
    handle?: ClassNameValue;
    class?: HTMLAttributes["class"];
  }>(),
  {
    id: "dashboard",
    title: "Dashboard",
  },
);

const classValue = computed(() => cn(props.class));
</script>
<template>
  <div class="flex h-screen w-full flex-col">
    <UDashboardPanel
      :id="id"
      :ui="{
        root: root,
        body: body,
        handle: handle,
      }"
      :class="classValue"
    >
      <template #header>
        <UDashboardNavbar :title="title">
          <template #leading>
            <UDashboardSidebarCollapse size="md" />
            <slot name="leading"></slot>
          </template>

          <template #right>
            <!-- <CustomersAddModal /> -->
            <ColorModeButton />
            <slot name="right"></slot>
          </template>
          <slot name="toolbar"></slot>
        </UDashboardNavbar>
      </template>
      <template #body>
        <div class="mx-auto h-full w-full flex-1 overflow-hidden">
          <div class="h-full overflow-y-auto px-2">
            <div class="mx-auto w-full space-x-3">
              <slot name="content"></slot>
            </div>
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
