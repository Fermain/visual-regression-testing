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
	import TimerIcon from '@lucide/svelte/icons/timer';
	import { formatDistanceToNow } from 'date-fns';

	let { data }: { data: PageData } = $props();

	let pollInterval: ReturnType<typeof setInterval>;
	let countdownInterval: ReturnType<typeof setInterval>;
	let now = $state(Date.now());

	onMount(() => {
		pollInterval = setInterval(() => {
			invalidateAll();
		}, 2000);
		// Update countdown every second
		countdownInterval = setInterval(() => {
			now = Date.now();
		}, 1000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
		if (countdownInterval) clearInterval(countdownInterval);
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

	function formatDuration(ms: number): string {
		if (ms < 1000) return '<1s';
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes}m`;
	}

	// Calculate running job's remaining time
	let runningTimeRemaining = $derived.by(() => {
		if (!data.running?.startedAt || !data.running?.estimatedDurationMs) return null;
		const elapsed = now - new Date(data.running.startedAt).getTime();
		const remaining = data.running.estimatedDurationMs - elapsed;
		return Math.max(0, remaining);
	});

	// Derived progress calculations
	let progressPercent = $derived(
		data.progress.total > 0 ? (data.progress.completed / data.progress.total) * 100 : 0
	);
	let failedPercent = $derived(
		data.progress.total > 0 ? (data.progress.failed / data.progress.total) * 100 : 0
	);
	let successPercent = $derived(progressPercent - failedPercent);
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

	<!-- Overall Progress -->
	{#if data.progress.isActive || data.progress.total > 0}
		<div class="mb-8 rounded-lg border bg-card p-4">
			<div class="flex items-center justify-between mb-2">
				<h2 class="text-sm font-medium">Overall Progress</h2>
				<div class="flex items-center gap-4 text-sm text-muted-foreground">
					{#if data.progress.isActive && data.progress.estimatedRemainingMs > 0}
						<span class="flex items-center gap-1.5">
							<TimerIcon class="h-3.5 w-3.5" />
							~{formatDuration(data.progress.estimatedRemainingMs)} remaining
						</span>
					{/if}
					<span>
						{data.progress.completed} / {data.progress.total} jobs
						{#if data.progress.failed > 0}
							<span class="text-destructive">({data.progress.failed} failed)</span>
						{/if}
					</span>
				</div>
			</div>
			<div class="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
			<div class="h-full flex">
				<div 
					class="h-full bg-green-500 transition-all duration-500 ease-out"
					style="width: {successPercent}%"
				></div>
				<div 
					class="h-full bg-destructive transition-all duration-500 ease-out"
					style="width: {failedPercent}%"
				></div>
			</div>
		</div>
			
			<!-- Project breakdown -->
			{#if data.progress.projects.length > 1}
				<div class="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
					{#each data.progress.projects as proj}
						{@const projPercent = proj.total > 0 ? ((proj.completed + proj.failed) / proj.total) * 100 : 0}
						{@const isDone = proj.completed + proj.failed === proj.total}
						{@const hasFailed = proj.failed > 0}
						<div class="text-xs p-2 rounded border bg-muted/30 {isDone && !hasFailed ? 'border-green-500/30' : ''} {hasFailed ? 'border-destructive/30' : ''}">
							<div class="flex items-center justify-between mb-1">
								<span class="font-medium truncate" title={proj.name}>{proj.name}</span>
								{#if isDone}
									{#if hasFailed}
										<XCircleIcon class="h-3 w-3 text-destructive shrink-0" />
									{:else}
										<CheckCircle2Icon class="h-3 w-3 text-green-500 shrink-0" />
									{/if}
								{/if}
							</div>
							<div class="h-1 w-full bg-secondary rounded-full overflow-hidden">
								<div 
									class="h-full {hasFailed ? 'bg-destructive' : 'bg-green-500'} transition-all duration-300"
									style="width: {projPercent}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

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
					<div class="flex items-center gap-3 text-xs text-muted-foreground">
						{#if runningTimeRemaining !== null && data.running?.estimatedDurationMs && data.running?.startedAt}
							{@const elapsed = now - new Date(data.running.startedAt).getTime()}
							{@const overTime = elapsed - data.running.estimatedDurationMs}
							<span class="flex items-center gap-1 font-mono tabular-nums {overTime > 0 ? 'text-red-500' : ''}">
								<TimerIcon class="h-3.5 w-3.5" />
								{#if overTime > 0}
									+{formatDuration(overTime)}
								{:else}
									{formatDuration(runningTimeRemaining)}
								{/if}
							</span>
						{/if}
						{#if data.running.startedAt}
							<span>
								Started {formatDistanceToNow(new Date(data.running.startedAt), { addSuffix: true })}
							</span>
						{/if}
					</div>
				</div>
				{#if data.running.estimatedDurationMs && data.running.startedAt}
					{@const elapsed = now - new Date(data.running.startedAt).getTime()}
					{@const progressPct = Math.min(100, (elapsed / data.running.estimatedDurationMs) * 100)}
					<div class="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
						<div 
							class="h-full bg-blue-500 transition-all duration-1000 ease-linear {progressPct >= 100 ? 'bg-amber-500' : ''}"
							style="width: {progressPct}%"
						></div>
					</div>
				{/if}
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
						{#if job.estimatedDurationMs}
							<span class="text-xs text-muted-foreground font-mono">
								~{formatDuration(job.estimatedDurationMs)}
							</span>
						{/if}
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
