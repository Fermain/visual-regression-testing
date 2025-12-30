<script lang="ts">
	import type { PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';
	import StopCircleIcon from '@lucide/svelte/icons/stop-circle';
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

	async function cancelJob(jobId: string) {
		await fetch('/api/run-all', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'cancel-job', jobId })
		});
		invalidateAll();
	}

	async function cancelAll() {
		if (!confirm('Cancel all queued jobs?')) return;
		await fetch('/api/run-all', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'cancel-all' })
		});
		invalidateAll();
	}

	async function clearHistory() {
		await fetch('/api/run-all', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'clear-history' })
		});
		invalidateAll();
	}
</script>

<div class="flex-1 overflow-auto p-6">
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-xl font-semibold">Queue</h1>
		{#if data.queued.length > 0}
			<Button variant="outline" size="sm" onclick={cancelAll}>
				<StopCircleIcon class="h-4 w-4 mr-1.5" />
				Cancel All
			</Button>
		{/if}
	</div>

	<!-- Currently Running -->
	{#if data.running}
		<div class="mb-8">
			<h2 class="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">Running</h2>
			<div class="rounded-lg border bg-card p-4">
				<div class="flex items-center gap-3">
					<Loader2Icon class="h-5 w-5 animate-spin text-blue-500" />
					<div class="flex-1">
						<p class="font-medium">{data.running.projectName}</p>
						<p class="text-sm text-muted-foreground">
							{data.running.command} • {data.running.pairId}
						</p>
					</div>
					{#if data.running.startedAt}
						<span class="text-xs text-muted-foreground">
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
					<div class="rounded-lg border bg-card p-3 flex items-center gap-3 group">
						<div class="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
							{i + 1}
						</div>
						<ClockIcon class="h-4 w-4 text-muted-foreground" />
						<div class="flex-1">
							<p class="font-medium text-sm">{job.projectName}</p>
							<p class="text-xs text-muted-foreground">{job.command} • {job.pairId}</p>
						</div>
						<Badge variant="outline" class="text-xs">{job.command}</Badge>
						<button 
							onclick={() => cancelJob(job.id)}
							class="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
							title="Cancel this job"
						>
							<XIcon class="h-4 w-4 text-destructive" />
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recent -->
	{#if data.completed.length > 0}
		<div>
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Recent ({data.completed.length})
				</h2>
				<Button variant="ghost" size="sm" onclick={clearHistory}>
					<TrashIcon class="h-3.5 w-3.5 mr-1" />
					Clear
				</Button>
			</div>
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
