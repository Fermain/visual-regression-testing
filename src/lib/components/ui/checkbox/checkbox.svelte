<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLInputAttributes } from 'svelte/elements';

	export type CheckboxProps = WithElementRef<HTMLInputAttributes> & {
		checked?: boolean;
		indeterminate?: boolean;
		onCheckedChange?: (checked: boolean) => void;
	};
</script>

<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import MinusIcon from '@lucide/svelte/icons/minus';

	let {
		class: className,
		checked = $bindable(false),
		indeterminate = false,
		onCheckedChange,
		ref = $bindable(null),
		...restProps
	}: CheckboxProps = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement;
		checked = target.checked;
		onCheckedChange?.(target.checked);
	}
</script>

<label
	class={cn(
		'relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-primary ring-offset-background transition-colors',
		'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		(checked || indeterminate) && 'bg-primary text-primary-foreground',
		className
	)}
>
	<input
		bind:this={ref}
		type="checkbox"
		class="sr-only"
		{checked}
		onchange={handleChange}
		{...restProps}
	/>
	{#if indeterminate}
		<MinusIcon class="h-3 w-3" />
	{:else if checked}
		<CheckIcon class="h-3 w-3" />
	{/if}
</label>

