<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import PlayIcon from '@lucide/svelte/icons/play';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import FileCheckIcon from '@lucide/svelte/icons/file-check';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { formatDistanceToNow } from 'date-fns';

	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';

	import { invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Derived state from project data
	let project = $derived(data.project);
	let report = $derived(data.report);
	let hasReport = $derived(report !== null);
	let hasReference = $derived(data.hasReference);
	let reportUrl = $derived(project ? `/report/${project.id}/html_report/index.html` : '');

	// Status management
	let isRunning = $state(false);
	let runningCommand = $state<'reference' | 'test' | 'approve' | null>(null);
	let pollInterval: ReturnType<typeof setInterval>;

	// Sync local running state with server status
	$effect(() => {
		if (project.status === 'running') {
			isRunning = true;
			// Start polling if not already polling
			if (!pollInterval) {
				pollInterval = setInterval(() => {
					invalidateAll();
				}, 2000);
			}
		} else {
			isRunning = false;
			runningCommand = null;
			if (pollInterval) {
				clearInterval(pollInterval);
				// @ts-ignore
				pollInterval = undefined;
			}
		}
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});

	let formEl = $state<HTMLFormElement | null>(null);

	let referenceDialogOpen = $state(false);
	let approveDialogOpen = $state(false);
	let pendingCommand = $state<'reference' | 'approve' | null>(null);

	function handleButtonClick(cmd: 'reference' | 'test' | 'approve') {
		if (cmd === 'reference' && hasReference) {
			pendingCommand = 'reference';
			referenceDialogOpen = true;
		} else if (cmd === 'approve') {
			pendingCommand = 'approve';
			approveDialogOpen = true;
		} else {
			submitCommand(cmd);
		}
	}

	function submitCommand(cmd: string) {
		if (!formEl) return;
		const input = formEl.querySelector(`input[name="command"][value="${cmd}"]`) as HTMLInputElement;
		if (input) {
			input.checked = true;
			formEl.requestSubmit();
		}
	}

	function handleReferenceConfirm() {
		if (pendingCommand === 'reference') {
			submitCommand('reference');
		}
		pendingCommand = null;
	}

	function handleApproveConfirm() {
		if (pendingCommand === 'approve') {
			submitCommand('approve');
		}
		pendingCommand = null;
	}
</script>

<ConfirmDialog
	bind:open={referenceDialogOpen}
	title="Replace Existing Reference?"
	description="This will replace the existing reference screenshots with new ones from the Canonical URL.

Only do this if the original reference was broken or incorrect.

If you have valid test failures, use 'Approve All Changes' instead to update the baseline."
	confirmText="Replace Reference"
	onConfirm={handleReferenceConfirm}
/>

<ConfirmDialog
	bind:open={approveDialogOpen}
	title="Approve All Changes?"
	description="This will set the current test screenshots as the new baseline reference.

Only approve if you have reviewed the differences and confirmed that all visual changes are intentional and correct.

This action cannot be undone."
	confirmText="Approve Changes"
	onConfirm={handleApproveConfirm}
/>

<div class="flex-1 flex flex-col overflow-hidden">
	<!-- Actions Bar -->
	<div class="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
		<div class="flex items-center gap-3">
			<form
				method="POST"
				action="?/run"
				bind:this={formEl}
				use:enhance={({ formData }) => {
					const cmd = formData.get('command') as 'reference' | 'test' | 'approve';
					// Optimistic UI update
					isRunning = true;
					runningCommand = cmd;
					
					return async ({ update }) => {
						await update();
						// We rely on polling for the actual completion state
					};
				}}
				class="flex items-center gap-2"
			>
				<input type="radio" name="command" value="reference" class="hidden" />
				<input type="radio" name="command" value="test" class="hidden" />
				<input type="radio" name="command" value="approve" class="hidden" />

				<Button
					type="button"
					disabled={isRunning}
					variant="secondary"
					size="sm"
					class="cursor-pointer disabled:cursor-not-allowed"
					onclick={() => handleButtonClick('reference')}
				>
					{#if runningCommand === 'reference' || (project.status === 'running' && !runningCommand)}
						<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
					{:else}
						<EyeIcon class="mr-1.5 h-3.5 w-3.5" />
					{/if}
					Create New Reference
				</Button>

				<Button
					type="button"
					disabled={isRunning}
					size="sm"
					class="cursor-pointer disabled:cursor-not-allowed"
					onclick={() => handleButtonClick('test')}
				>
					{#if runningCommand === 'test' || (project.status === 'running' && !runningCommand)}
						<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
					{:else}
						<PlayIcon class="mr-1.5 h-3.5 w-3.5" />
					{/if}
					Run Test
				</Button>

				<Button
					type="button"
					disabled={isRunning}
					variant="outline"
					size="sm"
					class="cursor-pointer disabled:cursor-not-allowed hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50"
					onclick={() => handleButtonClick('approve')}
				>
					{#if runningCommand === 'approve' || (project.status === 'running' && !runningCommand)}
						<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
					{:else}
						<FileCheckIcon class="mr-1.5 h-3.5 w-3.5" />
					{/if}
					Approve All Changes
				</Button>
			</form>

			{#if isRunning}
				<Badge variant="outline" class="animate-pulse border-blue-500/50 text-blue-400">
					<Loader2Icon class="h-3 w-3 mr-1 animate-spin" />
					Running...
				</Badge>
			{/if}

			{#if project.lastResult && !isRunning}
				{#if project.lastResult.success}
					<Badge variant="outline" class="text-xs border-green-500/50 text-green-500">
						{project.lastResult.command} completed
					</Badge>
				{:else}
					<Badge variant="destructive" class="text-xs">
						Error: {project.lastResult.error || 'Failed'}
					</Badge>
				{/if}
			{/if}
		</div>

		<div class="flex items-center gap-2">
			{#if project.lastRun}
				<span class="text-xs text-muted-foreground">
					Last run: {formatDistanceToNow(new Date(project.lastRun), { addSuffix: true })}
				</span>
			{/if}
			<Button variant="ghost" size="sm" href="/project/{project.id}/edit" class="cursor-pointer">
				<SettingsIcon class="h-3.5 w-3.5 mr-1.5" />
				Edit
			</Button>
			{#if hasReport}
				<Button variant="ghost" size="sm" href={reportUrl} target="_blank" class="cursor-pointer">
					<ExternalLinkIcon class="h-3.5 w-3.5 mr-1.5" />
					Open Report
				</Button>
			{/if}
		</div>
	</div>

	<!-- Report Preview -->
	<div class="flex-1 relative">
		{#if hasReport}
			<iframe src={reportUrl} title="BackstopJS Report" class="absolute inset-0 w-full h-full border-0"></iframe>
		{:else if hasReference && data.referenceImages?.length > 0}
			<div class="absolute inset-0 overflow-y-auto p-8 bg-muted/5">
				<div class="max-w-6xl mx-auto">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h3 class="text-lg font-medium text-foreground">Reference Images</h3>
							<p class="text-sm text-muted-foreground">These are the baseline images used for comparison.</p>
						</div>
						<Button size="sm" onclick={() => handleButtonClick('test')}>
							<PlayIcon class="mr-1.5 h-3.5 w-3.5" />
							Run Test
						</Button>
					</div>
					
					<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
						{#each data.referenceImages as image}
							<div class="border rounded-lg bg-card overflow-hidden shadow-sm">
								<div class="aspect-video relative bg-muted/20">
									<img 
										src="/report/{project.id}/bitmaps_reference/{image}" 
										alt={image}
										class="absolute inset-0 w-full h-full object-contain"
										loading="lazy"
									/>
								</div>
								<div class="p-3 border-t">
									<p class="text-xs text-muted-foreground break-all font-mono">{image}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<div class="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/5">
				<div class="rounded-full bg-muted p-6 mb-4">
					<PlayIcon class="h-10 w-10 opacity-20" />
				</div>
				<p class="font-medium text-lg">No report available</p>
				<p class="text-sm max-w-md">
					Configure your project URLs and paths, then run a test to generate the visual regression report.
				</p>
				{#if !project.canonicalBaseUrl || !project.candidateBaseUrl}
					<Button variant="outline" href="/project/{project.id}/edit" class="mt-4 cursor-pointer">
						<SettingsIcon class="h-4 w-4 mr-2" />
						Configure Project
					</Button>
				{/if}
				{#if form?.command === 'reference' && form?.success}
					<p class="text-sm text-green-500 mt-4">
						Reference created! Now run "Run Test" to compare.
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
