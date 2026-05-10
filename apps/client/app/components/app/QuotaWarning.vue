<script lang="ts" setup>
withDefaults(
	defineProps<{
		title?: string;
		description?: string;
		labelButton?: string;
		varianButton?: "link" | "solid" | "outline" | "soft" | "subtle" | "ghost";
		colorButton?:
			| "warning"
			| "primary"
			| "secondary"
			| "success"
			| "info"
			| "error"
			| "neutral";
		link?: string;
	}>(),
	{
		title: "Peringatan Kuota",
		description:
			"Penggunaan klik Anda telah mencapai 0 dari batas bulanan. Pertimbangkan untuk meningkatkan paket Anda.",
		labelButton: "Upgrade Paket",
		varianButton: "solid",
		colorButton: "warning",
		link: "/admin",
	},
);
</script>

<template>
	<div
		class="rounded-xl border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-600 dark:bg-yellow-900/20"
	>
		<div class="flex items-start gap-4">
			<div class="text-2xl">⚠️</div>
			<div class="flex-1">
				<h3 class="mb-2 font-semibold text-yellow-800 dark:text-yellow-200">
					{{ title }}
				</h3>
				<p class="mb-4 text-yellow-700 dark:text-yellow-300">
					{{ description }}
				</p>
				<UButton
					:to="varianButton === 'link' ? link : undefined"
					:color="colorButton"
					:variant="varianButton"
					class="text-sm"
				>
					{{ labelButton }}
				</UButton>
			</div>
		</div>
	</div>
</template>
