<script lang="ts">
	import type { PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import { formatDistanceToNow } from 'date-fns';

	let { data }: { data: PageData } = $props();

	let pollInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		pollInterval = setInterval(() => {
			invalidateAll();
		}, 2000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<div class="flex-1 overflow-auto p-6">
	<h1 class="text-xl font-semibold mb-6">Queue</h1>

	<!-- Currently Running -->
	{#if data.running}
		<div class="mb-8">
			<h2 class="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Running</h2>
			<div class="rounded-lg border bg-card p-4">
				<div class="flex items-center gap-3">
					<Loader2Icon class="h-5 w-5 animate-spin text-blue-500" />
					<div>
						<p class="font-medium">{data.running.projectName}</p>
						<p class="text-sm text-muted-foreground">
							{data.running.command} • {data.running.pairId}
						</p>
					</div>
					{#if data.running.startedAt}
						<span class="ml-auto text-xs text-muted-foreground">
							Started {formatDistanceToNow(new Date(data.running.startedAt), { addSuffix: true })}
						</span>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Queued -->
	<div class="mb-8">
		<h2 class="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
			Queued ({data.queued.length})
		</h2>
		{#if data.queued.length === 0}
			<p class="text-sm text-muted-foreground">No jobs in queue.</p>
		{:else}
			<div class="space-y-2">
				{#each data.queued as job, i}
					<div class="rounded-lg border bg-card p-3 flex items-center gap-3">
						<div class="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
							{i + 1}
						</div>
						<ClockIcon class="h-4 w-4 text-muted-foreground" />
						<div class="flex-1">
							<p class="font-medium text-sm">{job.projectName}</p>
							<p class="text-xs text-muted-foreground">{job.command} • {job.pairId}</p>
						</div>
						<Badge variant="outline" class="text-xs">{job.command}</Badge>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recent -->
	{#if data.completed.length > 0}
		<div>
			<h2 class="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
				Recent ({data.completed.length})
			</h2>
			<div class="space-y-2">
				{#each data.completed as job}
					<div class="rounded-lg border bg-card/50 p-3 flex items-center gap-3">
						{#if job.status === 'completed'}
							<CheckCircle2Icon class="h-4 w-4 text-green-500" />
						{:else}
							<XCircleIcon class="h-4 w-4 text-destructive" />
						{/if}
						<div class="flex-1">
							<p class="font-medium text-sm">{job.projectName}</p>
							<p class="text-xs text-muted-foreground">
								{job.command} • {job.pairId}
								{#if job.error}
									<span class="text-destructive"> • {job.error}</span>
								{/if}
							</p>
						</div>
						{#if job.completedAt}
							<span class="text-xs text-muted-foreground">
								{formatDistanceToNow(new Date(job.completedAt), { addSuffix: true })}
							</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

