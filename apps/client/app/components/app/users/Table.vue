<script setup lang="ts">
import type {
  User,
  Subscription,
  Campaign,
  Role,
  UserRole,
} from "@forge-exchange/db";
import type { TableColumn } from "@nuxt/ui";
import { upperFirst } from "scule";
import { getPaginationRowModel } from "@tanstack/table-core";
import type { Row, PaginationState } from "@tanstack/table-core";
import type { Column } from "@tanstack/vue-table";

interface UserWithRoles extends User {
  subscription: Subscription;
  role: Role;
  campaigns: Campaign[];
}

const emits = defineEmits<{
  (e: "change-status", user: UserWithRoles, status: StatusActive): void;
  (e: "change-role", user: UserWithRoles, role: UserRole): void;
  (e: "edit-user", user: UserWithRoles): void;
  (e: "delete", user: UserWithRoles): void;
  (e: "delete-modal-submit"): Promise<void>;
  (e: "prev"): void;
  (e: "next"): void;
  (e: "go-to-current-page", page: number): void;
}>();
const props = defineProps<{
  users?: UserWithRoles[];
  loading?: boolean;
  totalPages: number;
  currentPage: number;
  perPage: number;
  visiblePages: number[];
}>();
const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UCheckbox = resolveComponent("UCheckbox");
const UTooltip = resolveComponent("UTooltip");

const table = useTemplateRef<any>("table");

const columnFilters = ref([
  {
    id: "name",
    value: "",
  },
  {
    id: "email",
    value: "",
  },
]);
const columnVisibility = ref();
const rowSelection = ref();
const pagination = ref<PaginationState>({
  pageIndex: 0,
  pageSize: props.perPage || 10,
});

function getRowItems(row: Row<UserWithRoles>) {
  return [
    {
      type: "label",
      label: "Actions",
    },
    {
      label: `${["superadmin", "admin"].includes(row.original.role.name) ? "Change to User" : " Make Admin"}`,
      icon: "material-symbols:admin-panel-settings",
      onSelect() {
        emits(
          "change-role",
          row.original,
          ["superadmin", "admin"].includes(row.original.role.name)
            ? "user"
            : "admin",
        );
      },
    },
    {
      type: "separator",
    },
    {
      label: `${row.original.isActive ? "Deactivate" : "Activate"}`,
      icon: `${row.original.isActive ? "i-lucide-pause" : "i-lucide-play"}`,
      async onSelect() {
        emits(
          "change-status",
          row.original,
          row.original.isActive ? "inactive" : "active",
        );
      },
    },
    {
      type: "separator",
    },
    {
      label: "Edit user",
      icon: "material-symbols:edit-square-outline",
      onSelect() {
        emits("edit-user", row.original);
      },
    },
    {
      type: "separator",
    },
    {
      label: "Delete user",
      icon: "material-symbols:delete-outline",
      color: "error",
      onSelect() {
        emits("delete", row.original);
      },
    },
  ];
}

const columns: TableColumn<UserWithRoles>[] = [
  {
    id: "select",
    header: ({ table }) =>
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? "indeterminate"
          : table.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          table.toggleAllPageRowsSelected(!!value),
        ariaLabel: "Select all",
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          row.toggleSelected(!!value),
        ariaLabel: "Select row",
      }),
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Name",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5 text-sm",
        size: "md",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h("div", { class: "flex items-center" }, [
        h("div", undefined, [
          h(
            "p",
            { class: "font-medium text-highlighted" },
            row.original.name || "",
          ),
        ]),
      ]);
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      const isSorted = column.getIsSorted();

      return h(UButton, {
        color: "neutral",
        variant: "ghost",
        label: "Email",
        icon: isSorted
          ? isSorted === "asc"
            ? "i-lucide-arrow-up-narrow-wide"
            : "i-lucide-arrow-down-wide-narrow"
          : "i-lucide-arrow-up-down",
        class: "-mx-2.5 text-sm",
        size: "md",
        onClick: () => column.toggleSorting(column.getIsSorted() === "asc"),
      });
    },
    cell: ({ row }) => {
      return h("div", { class: "flex items-center" }, [
        h("div", undefined, [
          h(
            "p",
            { class: "font-medium text-highlighted" },
            row.original.email || "",
          ),
        ]),
      ]);
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.isActive;
      const color = status ? "success" : "error";
      return h("div", { class: "flex items-center gap-3" }, [
        h(
          UTooltip,
          {
            text: "Change User Status",
          },
          () =>
            h(UButton, {
              class: "text-neutral-100 dark:text-neutral-50 ",
              variant: "outline",
              color: `${status ? "success" : "error"}`,
              size: "md",
              icon: status ? "i-lucide-pause" : "i-lucide-play",
              ui: {
                leadingIcon: `${status ? "text-primary-500" : "text-red-500"}`,
              },
              onClick: () =>
                emits(
                  "change-status",
                  row.original,
                  row.original.isActive ? "inactive" : "active",
                ),
            }),
        ),
        h(UBadge, { class: "uppercase", variant: "subtle", color }, () =>
          status ? "Active" : "Inactive",
        ),
      ]);
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      return h(
        UBadge,
        {
          class: "uppercase text-white text-xs",
          variant: "solid",
          color: "info",
        },
        () => row.original.role?.name || "",
      );
    },
  },
  {
    accessorKey: "balance",
    header: "Balance",
    cell: ({ row }) => {
      return h(
        UBadge,
        { class: "uppercase text-xs", variant: "subtle", color: "warning" },
        () => row.original.subscription.creditBalance.toString() || "0",
      );
    },
  },
  {
    accessorKey: "limit",
    header: "Limit",
    cell: ({ row }) => {
      return h(
        UBadge,
        { class: "uppercase text-xs", variant: "subtle", color: "warning" },
        () => row.original.subscription.creditLimit.toString() || "0",
      );
    },
  },
  {
    accessorKey: "used",
    header: "Used",
    cell: ({ row }) => {
      return h(
        UBadge,
        {
          class: "uppercase text-xs",
          variant: "subtle",
          color: "warning",
        },
        () => row.original.subscription.creditUsed.toString() || "0",
      );
    },
  },
  {
    accessorKey: "expiredAt",
    header: "Expired",
    cell: ({ row }) => {
      const expiredStatus =
        row.original.subscription.expiredAt &&
        new Date(row.original.subscription.expiredAt) < new Date()
          ? "Expired"
          : "Active";
      return h("div", { class: "flex items-center" }, [
        h(
          UBadge,
          {
            class: "uppercase",
            variant: "subtle",
            color: `${expiredStatus === "Expired" ? "error" : "info"}`,
          },
          () => expiredStatus,
        ),
      ]);
    },
  },
  {
    accessorKey: "createdAt",
    header: "Joined",
    cell: ({ row }) => {
      return h("div", { class: "flex items-center" }, [
        h(
          "p",
          { class: "font-medium text-highlighted" },
          row.original.createdAt
            ? formatTimeAgo(
                new Date(row.original.createdAt).toISOString(),
                "en",
              )
            : "N/A",
        ),
      ]);
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return h(
        "div",
        { class: "text-right" },
        h(
          UDropdownMenu,
          {
            content: {
              align: "end",
            },
            items: getRowItems(row),
          },
          () =>
            h(UButton, {
              icon: "i-lucide-ellipsis-vertical",
              color: "neutral",
              variant: "ghost",
              class: "ml-auto",
            }),
        ),
      );
    },
  },
];
</script>

<template>
  <UPageCard
    spotlight
    spotlight-color="primary"
    :ui="{
      root: 'overflow-hidden shadow-md w-full overflow-auto',
      container:
        'shadow-md border border-primary/20 dark:border-primary/35 rounded-lg',
    }"
  >
    <div class="flex w-full items-center justify-center md:justify-end">
      <AppDeleteModal
        :count="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
        label="User"
        @submit="
          async () => {
            await emits('delete-modal-submit');
          }
        "
      >
        <UButton
          v-if="table?.tableApi?.getFilteredSelectedRowModel().rows.length"
          label="Delete"
          color="error"
          variant="solid"
          icon="i-lucide-trash"
          size="md"
          class="mr-2 text-white"
        >
          <template #trailing>
            <UKbd>
              {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length }}
            </UKbd>
          </template>
        </UButton>
      </AppDeleteModal>
      <UDropdownMenu
        :items="
          table?.tableApi
            ?.getAllColumns()
            .filter((column: any) => column.getCanHide())
            .map((column: any) => ({
              label: upperFirst(column.id),
              type: 'checkbox' as const,
              checked: column.getIsVisible(),
              onUpdateChecked(checked: boolean) {
                table?.tableApi
                  ?.getColumn(column.id)
                  ?.toggleVisibility(!!checked);
              },
              onSelect(e?: Event) {
                e?.preventDefault();
              },
            }))
        "
        :content="{ align: 'end' }"
      >
        <UButton
          label="Display"
          color="neutral"
          variant="outline"
          size="md"
          trailing-icon="i-lucide-settings-2"
        />
      </UDropdownMenu>
    </div>
    <UTable
      ref="table"
      v-model:column-filters="columnFilters"
      v-model:column-visibility="columnVisibility"
      v-model:row-selection="rowSelection"
      v-model:pagination="pagination"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel(),
      }"
      class="shrink-0"
      :data="props.users"
      :columns="columns"
      :loading="loading"
      :ui="{
        root: 'w-full overflow-auto overflow-hidden',
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default',
      }"
      loading-color="primary"
      loading-animation="carousel"
    />
    <div
      class="border-default mt-auto flex items-center justify-between gap-3 border-t pt-4"
    >
      <div class="text-muted text-sm">
        {{ table?.tableApi?.getFilteredSelectedRowModel().rows.length || 0 }} of
        {{ props?.users?.length || 0 }} row(s) selected.
      </div>
    </div>
    <div
      v-if="totalPages > 0 && props?.users?.length"
      class="bg-elevated w-full border-t border-muted px-6 py-3"
    >
      <div class="flex w-full items-center justify-between">
        <p class="text-sm text-muted">
          Showing {{ (currentPage - 1) * perPage + 1 }} to
          {{ Math.min(currentPage * perPage, props?.users?.length || 0) }}
          of {{ props?.users?.length || 0 }} results
        </p>
        <div class="flex gap-2">
          <UButton
            variant="outline"
            color="neutral"
            size="md"
            :disabled="currentPage === 1"
            @click="emits('prev')"
          >
            Previous
          </UButton>
          <UButton
            v-for="page in visiblePages"
            :key="page"
            variant="solid"
            color="primary"
            class="text-white"
            size="md"
            :disabled="currentPage === totalPages"
            @click="emits('go-to-current-page', page)"
          >
            {{ page }}
          </UButton>
          <UButton
            variant="outline"
            color="neutral"
            size="md"
            :disabled="currentPage === totalPages"
            @click="emits('next')"
          >
            Next
          </UButton>
        </div>
      </div>
    </div>
  </UPageCard>
</template>
