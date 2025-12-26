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
	import * as Dialog from '$lib/components/ui/dialog';
	import XIcon from '@lucide/svelte/icons/x';

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
	let progress = $derived(project.progress);

	// Report Stats
	let reportStats = $derived.by(() => {
		if (!report || !report.tests) return null;
		const total = report.tests.length;
		const failed = report.tests.filter((t: any) => t.status === 'fail').length;
		const passed = report.tests.filter((t: any) => t.status === 'pass').length;
		return { total, failed, passed };
	});

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

	// Lightbox state
	let lightboxOpen = $state(false);
	let lightboxImage = $state<string | null>(null);

	function openLightbox(image: string) {
		lightboxImage = image;
		lightboxOpen = true;
	}

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

<!-- Lightbox -->
<Dialog.Root bind:open={lightboxOpen}>
	<Dialog.Content class="max-w-[95vw] w-auto h-[95vh] p-0 overflow-hidden bg-transparent border-0 shadow-none flex flex-col items-center justify-center outline-none">
		<div class="relative w-full h-full flex flex-col items-center bg-black/80 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10">
			<!-- Header / Close area -->
			<div class="absolute top-4 right-4 z-50">
				<Dialog.Close class="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors">
					<XIcon class="w-6 h-6" />
				</Dialog.Close>
			</div>

			<!-- Image Container -->
			<div class="flex-1 w-full overflow-auto p-8 flex items-start justify-center">
				{#if lightboxImage}
					<img 
						src="/report/{project.id}/bitmaps_reference/{lightboxImage}" 
						alt={lightboxImage}
						class="max-w-full h-auto object-contain shadow-2xl rounded-sm"
					/>
				{/if}
			</div>

			<!-- Footer -->
			{#if lightboxImage}
				<div class="w-full p-4 bg-black/50 backdrop-blur-md border-t border-white/10 text-center shrink-0 z-10">
					<p class="text-white/90 font-mono text-sm break-all">
						{lightboxImage}
					</p>
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

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
					variant={!hasReference ? "default" : "secondary"}
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
					disabled={isRunning || !hasReference}
					variant={hasReference && (!hasReport || (reportStats?.passed === reportStats?.total)) ? "default" : "secondary"}
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
					disabled={isRunning || !hasReport || reportStats?.failed === 0}
					variant={reportStats?.failed > 0 ? "default" : "outline"}
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
				<div class="flex flex-col gap-1 min-w-[200px]">
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span class="flex items-center">
							<Loader2Icon class="h-3 w-3 mr-1 animate-spin" />
							Running...
						</span>
						{#if progress && progress.total > 0}
							<span>{progress.completed} / {progress.total} items</span>
						{/if}
					</div>
					{#if progress && progress.total > 0}
						<div class="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
							<div 
								class="h-full bg-blue-500 transition-all duration-500 ease-out"
								style="width: {(progress.completed / progress.total) * 100}%"
							></div>
						</div>
					{/if}
				</div>
			{/if}

			{#if project.lastResult && !isRunning && !reportStats}
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

			{#if reportStats && !isRunning}
				<div class="flex items-center gap-2 text-sm">
					<Badge variant={reportStats.failed > 0 ? "destructive" : "default"} class={reportStats.failed === 0 ? "bg-green-600 hover:bg-green-700" : ""}>
						{reportStats.passed} Passed
					</Badge>
					{#if reportStats.failed > 0}
						<Badge variant="destructive">
							{reportStats.failed} Failed
						</Badge>
					{/if}
				</div>
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
							<div class="border rounded-lg bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div 
									class="aspect-video relative bg-muted/20 cursor-zoom-in group"
									onclick={() => openLightbox(image)}
								>
									<img 
										src="/report/{project.id}/bitmaps_reference/{image}" 
										alt={image}
										class="absolute inset-0 w-full h-full object-contain p-2"
										loading="lazy"
									/>
									<div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
										<div class="bg-background/80 backdrop-blur-sm rounded-full p-2 text-foreground shadow-sm">
											<EyeIcon class="w-5 h-5" />
										</div>
									</div>
								</div>
								<div class="p-3 border-t bg-muted/5">
									<p class="text-xs text-muted-foreground break-all font-mono" title={image}>{image}</p>
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
