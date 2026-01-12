<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import PlayIcon from '@lucide/svelte/icons/play';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import FileCheckIcon from '@lucide/svelte/icons/file-check';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import LinkIcon from '@lucide/svelte/icons/link';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import { formatDistanceToNow } from 'date-fns';

	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import XIcon from '@lucide/svelte/icons/x';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

	import { invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import StopCircleIcon from '@lucide/svelte/icons/stop-circle';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Get selectedPair from parent layout data via $page.data
	let selectedPair = $derived($page.data.selectedPair);
	let urlPairs = $derived($page.data.urlPairs || []);

	// Derived state from project data
	let project = $derived(data.project);
	let pairResult = $derived(data.pairResult);
	let linkCheckResult = $derived(data.linkCheckResult);
	let queuePosition = $derived(data.queuePosition);
	let report = $derived(data.report);
	let hasReport = $derived(report !== null);
	let hasReference = $derived(data.hasReference);
	let reportUrl = $derived(
		project && selectedPair
			? `/report/${project.id}/${selectedPair.id}/html_report/index.html`
			: ''
	);
	let referenceBasePath = $derived(
		project && selectedPair ? `/report/${project.id}/${selectedPair.id}` : ''
	);

	// Status management
	let isRunning = $derived(pairResult?.status === 'running' || linkCheckResult?.status === 'running');
	let isQueued = $derived(pairResult?.status === 'queued' || linkCheckResult?.status === 'queued');
	let isBusy = $derived(isRunning || isQueued);
	let runningCommand = $state<'reference' | 'test' | 'approve' | 'linkcheck' | null>(null);
	let pollInterval: ReturnType<typeof setInterval>;
	let visualProgress = $derived(pairResult?.progress);
	let linkProgress = $derived(linkCheckResult?.progress);

	// Report Stats
	let reportStats = $derived.by(() => {
		if (!report || !Array.isArray(report.tests)) return null;
		const tests = report.tests.filter((t: any) => t && typeof t === 'object' && 'status' in t);
		const total = tests.length;
		const failed = tests.filter((t: any) => t.status === 'fail').length;
		const passed = tests.filter((t: any) => t.status === 'pass').length;
		return { total, failed, passed };
	});

	// Poll for status updates when queued or running
	$effect(() => {
		if (pairResult?.status === 'running' || pairResult?.status === 'queued' || linkCheckResult?.status === 'running' || linkCheckResult?.status === 'queued') {
			if (!pollInterval) {
				pollInterval = setInterval(() => {
					invalidateAll();
				}, 2000);
			}
		} else {
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

	function handleButtonClick(cmd: 'reference' | 'test' | 'approve' | 'linkcheck') {
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

	async function cancelQueuedJobs() {
		if (!project || !selectedPair) return;
		await fetch('/api/project/cancel', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ 
				projectId: project.id, 
				pairId: selectedPair.id 
			})
		});
		invalidateAll();
	}

	// Link analysis helper
	let linkComparison = $derived.by(() => {
		if (!linkCheckResult?.canonical || !linkCheckResult?.candidate) return null;
		
		const canonicalLinks = new Set(linkCheckResult.canonical.links.map(l => l.url));
		const candidateLinks = new Set(linkCheckResult.candidate.links.map(l => l.url));
		
		const dropped = Array.from(canonicalLinks).filter(url => !candidateLinks.has(url));
		const added = Array.from(candidateLinks).filter(url => !canonicalLinks.has(url));
		
		const brokenCanonical = linkCheckResult.canonical.links.filter(l => l.status !== 'Ok' && l.status !== 'OK');
		const brokenCandidate = linkCheckResult.candidate.links.filter(l => l.status !== 'Ok' && l.status !== 'OK');

		return { dropped, added, brokenCanonical, brokenCandidate };
	});

	// Link filter state
	type LinkFilter = 'all' | 'errors' | '404' | 'dropped' | 'added' | 'ok';
	let linkFilter = $state<LinkFilter>('all');

	// Combined and filtered link data
	let filteredLinks = $derived.by(() => {
		if (!linkCheckResult?.canonical || !linkCheckResult?.candidate) return [];

		const canonicalUrls = new Set(linkCheckResult.canonical.links.map(l => l.url));
		const candidateUrls = new Set(linkCheckResult.candidate.links.map(l => l.url));

		// Build combined list with comparison info
		const combined: Array<{
			url: string;
			refStatus: string | null;
			refCode: number | null;
			testStatus: string | null;
			testCode: number | null;
			isDropped: boolean;
			isAdded: boolean;
		}> = [];

		// Add all canonical links
		for (const link of linkCheckResult.canonical.links) {
			const testLink = linkCheckResult.candidate.links.find(l => l.url === link.url);
			combined.push({
				url: link.url,
				refStatus: link.status,
				refCode: link.statusCode ?? null,
				testStatus: testLink?.status ?? null,
				testCode: testLink?.statusCode ?? null,
				isDropped: !candidateUrls.has(link.url),
				isAdded: false
			});
		}

		// Add candidate-only links (added)
		for (const link of linkCheckResult.candidate.links) {
			if (!canonicalUrls.has(link.url)) {
				combined.push({
					url: link.url,
					refStatus: null,
					refCode: null,
					testStatus: link.status,
					testCode: link.statusCode ?? null,
					isDropped: false,
					isAdded: true
				});
			}
		}

		// Apply filter
		return combined.filter(link => {
			switch (linkFilter) {
				case 'errors':
					return (link.refStatus && link.refStatus !== 'OK') || 
					       (link.testStatus && link.testStatus !== 'OK');
				case '404':
					return link.refCode === 404 || link.testCode === 404;
				case 'dropped':
					return link.isDropped;
				case 'added':
					return link.isAdded;
				case 'ok':
					return link.refStatus === 'OK' && link.testStatus === 'OK';
				default:
					return true;
			}
		});
	});

	// Link stats for filter badges
	let linkStats = $derived.by(() => {
		if (!linkCheckResult?.canonical || !linkCheckResult?.candidate) return null;

		const canonicalUrls = new Set(linkCheckResult.canonical.links.map(l => l.url));
		const candidateUrls = new Set(linkCheckResult.candidate.links.map(l => l.url));

		let errors = 0;
		let notFound = 0;
		let dropped = 0;
		let added = 0;
		let ok = 0;
		const total = new Set([...canonicalUrls, ...candidateUrls]).size;

		for (const link of linkCheckResult.canonical.links) {
			if (link.status !== 'OK') errors++;
			if (link.statusCode === 404) notFound++;
			if (!candidateUrls.has(link.url)) dropped++;
		}

		for (const link of linkCheckResult.candidate.links) {
			if (link.status !== 'OK') errors++;
			if (link.statusCode === 404) notFound++;
			if (!canonicalUrls.has(link.url)) added++;
			if (link.status === 'OK' && linkCheckResult.canonical.links.find(l => l.url === link.url)?.status === 'OK') {
				ok++;
			}
		}

		return { total, errors, notFound, dropped, added, ok };
	});

	// Hotkeys for filters
	function handleKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
		
		switch (e.key) {
			case '1': linkFilter = 'all'; break;
			case '2': linkFilter = 'errors'; break;
			case '3': linkFilter = '404'; break;
			case '4': linkFilter = 'dropped'; break;
			case '5': linkFilter = 'added'; break;
			case '0': linkFilter = 'ok'; break;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

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
	<Dialog.Content showCloseButton={false} class="max-w-[95vw] w-auto h-[95vh] p-0 overflow-hidden bg-transparent border-0 shadow-none flex flex-col items-center justify-center outline-none">
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
						src="{referenceBasePath}/bitmaps_reference/{lightboxImage}" 
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
	<!-- Hidden form for commands -->
	<form
		method="POST"
		action="?/run"
		bind:this={formEl}
		use:enhance={({ formData }) => {
			const cmd = formData.get('command') as 'reference' | 'test' | 'approve' | 'linkcheck';
			isRunning = true;
			runningCommand = cmd;
			return async ({ update }) => {
				await update();
			};
		}}
		class="hidden"
	>
		<input type="hidden" name="pairId" value={selectedPair?.id || ''} />
		<input type="radio" name="command" value="reference" />
		<input type="radio" name="command" value="test" />
		<input type="radio" name="command" value="approve" />
		<input type="radio" name="command" value="linkcheck" />
	</form>

	<!-- Actions Bar -->
	<div class="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20 shrink-0">
		<div class="flex items-center gap-4">
			<!-- Visual Testing Actions -->
			<div class="flex items-center gap-1.5">
				{#if !hasReference}
					<Button
						type="button"
						disabled={isBusy || !selectedPair}
						size="sm"
						class="cursor-pointer disabled:cursor-not-allowed"
						onclick={() => handleButtonClick('reference')}
					>
						{#if runningCommand === 'reference'}
							<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
						{:else}
							<CameraIcon class="mr-1.5 h-3.5 w-3.5" />
						{/if}
						Create Reference
					</Button>
				{:else}
					<Button
						type="button"
						disabled={isBusy || !selectedPair}
						size="sm"
						class="cursor-pointer disabled:cursor-not-allowed"
						onclick={() => handleButtonClick('test')}
					>
						{#if runningCommand === 'test'}
							<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
						{:else}
							<PlayIcon class="mr-1.5 h-3.5 w-3.5" />
						{/if}
						Run Test
					</Button>

					{#if reportStats && reportStats.failed > 0}
						<Button
							type="button"
							disabled={isBusy || !selectedPair}
							variant="outline"
							size="sm"
							class="cursor-pointer disabled:cursor-not-allowed border-green-500/50 text-green-600 hover:bg-green-500/10 hover:text-green-600"
							onclick={() => handleButtonClick('approve')}
						>
							{#if runningCommand === 'approve'}
								<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
							{:else}
								<FileCheckIcon class="mr-1.5 h-3.5 w-3.5" />
							{/if}
							Approve
						</Button>
					{/if}

					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Button variant="ghost" size="icon" class="h-8 w-8 cursor-pointer">
								<MoreHorizontalIcon class="h-4 w-4" />
							</Button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="start">
							<DropdownMenu.Item 
								onclick={() => handleButtonClick('reference')}
								disabled={isBusy || !selectedPair}
								class="cursor-pointer"
							>
								<CameraIcon class="mr-2 h-4 w-4" />
								Recreate Reference
							</DropdownMenu.Item>
							{#if !reportStats || reportStats.failed === 0}
								<DropdownMenu.Item 
									onclick={() => handleButtonClick('approve')}
									disabled={isBusy || !hasReport || !selectedPair}
									class="cursor-pointer"
								>
									<FileCheckIcon class="mr-2 h-4 w-4" />
									Approve Changes
								</DropdownMenu.Item>
							{/if}
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{/if}
			</div>

			<!-- Separator -->
			<div class="h-6 w-px bg-border"></div>

			<!-- Link Check -->
			<Button
				type="button"
				disabled={isBusy || !selectedPair}
				variant="ghost"
				size="sm"
				class="cursor-pointer disabled:cursor-not-allowed"
				onclick={() => handleButtonClick('linkcheck')}
			>
				{#if runningCommand === 'linkcheck' || linkCheckResult?.status === 'running'}
					<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
				{:else}
					<LinkIcon class="mr-1.5 h-3.5 w-3.5" />
				{/if}
				Check Links
			</Button>

			<!-- Status Indicators -->
			{#if isQueued}
				<div class="flex items-center gap-2 text-xs text-muted-foreground ml-2">
					<Loader2Icon class="h-3 w-3 animate-spin" />
					<span>Queued{queuePosition > 0 ? ` (#${queuePosition})` : ''}</span>
					<button 
						onclick={cancelQueuedJobs}
						class="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
						title="Cancel queued jobs"
					>
						<StopCircleIcon class="h-3 w-3" />
						Cancel
					</button>
				</div>
			{:else if pairResult?.status === 'running' && visualProgress}
				<div class="flex-1 flex flex-col gap-1 max-w-md ml-2">
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span class="flex items-center">
							<Loader2Icon class="h-3 w-3 mr-1 animate-spin" />
							Visual test running...
						</span>
						{#if visualProgress.total > 0}
							<span>{visualProgress.completed}/{visualProgress.total}</span>
						{/if}
					</div>
					{#if visualProgress.total > 0}
						<div class="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
							<div 
								class="h-full bg-primary transition-all duration-500 ease-out"
								style="width: {(visualProgress.completed / visualProgress.total) * 100}%"
							></div>
						</div>
					{/if}
				</div>
			{:else if linkCheckResult?.status === 'running'}
				<div class="flex-1 flex items-center gap-3 max-w-md ml-2">
					<Loader2Icon class="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between text-xs text-muted-foreground mb-1">
							<span>
								Checking links ({linkProgress?.phase === 'canonical' ? 'reference' : 'candidate'})
							</span>
							{#if linkProgress?.checked}
								<span>{linkProgress.checked} checked</span>
							{/if}
						</div>
						{#if linkProgress?.current}
							<div class="text-[10px] text-muted-foreground/70 truncate" title={linkProgress.current}>
								{linkProgress.current}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<div class="flex items-center gap-1">
			<!-- Report Status -->
			{#if reportStats && !isRunning}
				<div class="flex items-center gap-1.5 mr-3">
					<Badge variant="outline" class={reportStats.failed === 0 ? "border-green-500/50 text-green-600" : ""}>
						{reportStats.passed} passed
					</Badge>
					{#if reportStats.failed > 0}
						<Badge variant="destructive">
							{reportStats.failed} failed
						</Badge>
					{/if}
				</div>
			{/if}

			<!-- Utility buttons -->
			{#if pairResult?.lastRun}
				<span class="text-[11px] text-muted-foreground mr-2">
					{formatDistanceToNow(new Date(pairResult.lastRun), { addSuffix: true })}
				</span>
			{/if}
			
			<Button variant="ghost" size="icon" href="/project/{project.id}/edit" class="h-8 w-8 cursor-pointer" title="Edit project">
				<SettingsIcon class="h-4 w-4" />
			</Button>
			
			{#if hasReport}
				<Button variant="ghost" size="icon" href={reportUrl} target="_blank" class="h-8 w-8 cursor-pointer" title="Open report in new tab">
					<ExternalLinkIcon class="h-4 w-4" />
				</Button>
				<Button 
					variant="ghost" 
					size="icon"
					href="/api/export/{project.id}/{selectedPair?.id}" 
					class="h-8 w-8 cursor-pointer"
					title="Export report as ZIP"
				>
					<DownloadIcon class="h-4 w-4" />
				</Button>
			{/if}
		</div>
	</div>

	<!-- Content Area -->
	<Tabs.Root value="visual" class="flex-1 flex flex-col overflow-hidden">
		<div class="flex items-center px-4 border-b bg-muted/10 shrink-0 h-10">
			<Tabs.List class="bg-transparent p-0 gap-6">
				<Tabs.Trigger value="visual" class="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none">
					Visual Report
				</Tabs.Trigger>
				<Tabs.Trigger value="links" class="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none">
					Link Report
					{#if linkCheckResult?.canonical?.failed || linkCheckResult?.candidate?.failed || linkComparison?.dropped?.length}
						<Badge variant="destructive" class="ml-2 px-1 h-4 min-w-4 text-[10px]">!</Badge>
					{/if}
				</Tabs.Trigger>
			</Tabs.List>
		</div>

		<Tabs.Content value="visual" class="flex-1 relative m-0 outline-hidden">
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
											src="{referenceBasePath}/bitmaps_reference/{image}" 
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
					{#if urlPairs.length === 0}
						<p class="text-sm max-w-md">
							Configure URL pairs in settings, then run a test to generate the visual regression report.
						</p>
						<Button variant="outline" href="/settings" class="mt-4 cursor-pointer">
							<SettingsIcon class="h-4 w-4 mr-2" />
							Configure URL Pairs
						</Button>
					{:else}
						<p class="text-sm max-w-md">
							Select a URL pair and run a test to generate the visual regression report.
						</p>
					{/if}
				</div>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="links" class="flex-1 flex flex-col overflow-hidden m-0 outline-hidden">
			{#if linkCheckResult?.canonical && linkCheckResult?.candidate && linkStats}
				<!-- Filter Bar -->
				<div class="flex items-center gap-2 px-4 py-2 border-b bg-muted/10 shrink-0">
					<span class="text-xs text-muted-foreground mr-2">Filter:</span>
					<button
						onclick={() => linkFilter = 'all'}
						class="px-2 py-1 text-xs rounded-md transition-colors {linkFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}"
					>
						All <span class="opacity-60">({linkStats.total})</span>
						<kbd class="ml-1 text-[10px] opacity-50">1</kbd>
					</button>
					<button
						onclick={() => linkFilter = 'errors'}
						class="px-2 py-1 text-xs rounded-md transition-colors {linkFilter === 'errors' ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-muted/80'} {linkStats.errors > 0 ? 'text-destructive' : ''}"
					>
						Errors <span class="opacity-60">({linkStats.errors})</span>
						<kbd class="ml-1 text-[10px] opacity-50">2</kbd>
					</button>
					<button
						onclick={() => linkFilter = '404'}
						class="px-2 py-1 text-xs rounded-md transition-colors {linkFilter === '404' ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-muted/80'} {linkStats.notFound > 0 ? 'text-destructive' : ''}"
					>
						404 <span class="opacity-60">({linkStats.notFound})</span>
						<kbd class="ml-1 text-[10px] opacity-50">3</kbd>
					</button>
					<button
						onclick={() => linkFilter = 'dropped'}
						class="px-2 py-1 text-xs rounded-md transition-colors {linkFilter === 'dropped' ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-muted/80'} {linkStats.dropped > 0 ? 'text-amber-600' : ''}"
					>
						Dropped <span class="opacity-60">({linkStats.dropped})</span>
						<kbd class="ml-1 text-[10px] opacity-50">4</kbd>
					</button>
					<button
						onclick={() => linkFilter = 'added'}
						class="px-2 py-1 text-xs rounded-md transition-colors {linkFilter === 'added' ? 'bg-blue-500 text-white' : 'bg-muted hover:bg-muted/80'}"
					>
						Added <span class="opacity-60">({linkStats.added})</span>
						<kbd class="ml-1 text-[10px] opacity-50">5</kbd>
					</button>
					<button
						onclick={() => linkFilter = 'ok'}
						class="px-2 py-1 text-xs rounded-md transition-colors {linkFilter === 'ok' ? 'bg-green-500 text-white' : 'bg-muted hover:bg-muted/80'}"
					>
						OK <span class="opacity-60">({linkStats.ok})</span>
						<kbd class="ml-1 text-[10px] opacity-50">0</kbd>
					</button>
					
					<span class="ml-auto text-xs text-muted-foreground">
						{filteredLinks.length} link{filteredLinks.length === 1 ? '' : 's'}
					</span>
				</div>

				<!-- Data Table -->
				<div class="flex-1 overflow-auto">
					<Table.Root>
						<Table.Header class="sticky top-0 bg-background z-10">
							<Table.Row>
								<Table.Head class="w-[50%]">URL</Table.Head>
								<Table.Head class="w-24 text-center">Reference</Table.Head>
								<Table.Head class="w-24 text-center">Test</Table.Head>
								<Table.Head class="w-24 text-center">Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each filteredLinks as link}
								{@const hasIssue = link.isDropped || link.isAdded || 
									(link.refStatus && link.refStatus !== 'OK') || 
									(link.testStatus && link.testStatus !== 'OK')}
								<Table.Row class={
									link.isDropped ? "bg-amber-500/10" : 
									link.isAdded ? "bg-blue-500/10" :
									hasIssue ? "bg-destructive/5" : ""
								}>
									<Table.Cell class="font-mono text-xs py-2">
										<a href={link.url} target="_blank" class="hover:underline truncate block max-w-full" title={link.url}>
											{link.url}
										</a>
									</Table.Cell>
									<Table.Cell class="text-center py-2">
										{#if link.refStatus === null}
											<span class="text-muted-foreground text-xs">—</span>
										{:else if link.refStatus === 'OK'}
											<Badge variant="outline" class="text-green-600 border-green-600/30 text-[10px] py-0">
												{link.refCode || 'OK'}
											</Badge>
										{:else}
											<Badge variant="destructive" class="text-[10px] py-0">
												{link.refCode || link.refStatus}
											</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-center py-2">
										{#if link.testStatus === null}
											<span class="text-muted-foreground text-xs">—</span>
										{:else if link.testStatus === 'OK'}
											<Badge variant="outline" class="text-green-600 border-green-600/30 text-[10px] py-0">
												{link.testCode || 'OK'}
											</Badge>
										{:else}
											<Badge variant="destructive" class="text-[10px] py-0">
												{link.testCode || link.testStatus}
											</Badge>
										{/if}
									</Table.Cell>
									<Table.Cell class="text-center py-2">
										{#if link.isDropped}
											<Badge variant="outline" class="text-amber-600 border-amber-500/30 text-[10px] py-0">Dropped</Badge>
										{:else if link.isAdded}
											<Badge variant="outline" class="text-blue-600 border-blue-500/30 text-[10px] py-0">Added</Badge>
										{:else if link.refStatus === 'OK' && link.testStatus === 'OK'}
											<CheckCircleIcon class="h-4 w-4 text-green-600 mx-auto" />
										{:else}
											<AlertCircleIcon class="h-4 w-4 text-destructive mx-auto" />
										{/if}
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={4} class="text-center py-8 text-muted-foreground">
										No links match the current filter
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{:else if linkCheckResult?.status === 'running'}
				<div class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
					<Loader2Icon class="h-12 w-12 animate-spin mb-4 opacity-20" />
					<p class="text-lg font-medium">Link Checker is running...</p>
					{#if linkProgress}
						<p class="text-sm mt-2">
							Checking {linkProgress.phase === 'canonical' ? 'reference' : 'test'} site 
							({linkProgress.checked} links checked)
						</p>
					{/if}
				</div>
			{:else if linkCheckResult?.status === 'queued'}
				<div class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
					<Loader2Icon class="h-12 w-12 animate-pulse mb-4 opacity-20" />
					<p class="text-lg font-medium">Link Checker is queued</p>
					<p class="text-sm">Waiting for other jobs to finish.</p>
				</div>
			{:else if linkCheckResult?.error}
				<div class="flex-1 flex flex-col items-center justify-center text-destructive">
					<AlertCircleIcon class="h-12 w-12 mb-4 opacity-20" />
					<p class="text-lg font-medium">Link Checker failed</p>
					<p class="text-sm">{linkCheckResult.error}</p>
					<Button variant="outline" class="mt-6" onclick={() => handleButtonClick('linkcheck')}>
						Try Again
					</Button>
				</div>
			{:else}
				<div class="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center p-8">
					<div class="rounded-full bg-muted p-6 mb-4">
						<LinkIcon class="h-12 w-12 opacity-20" />
					</div>
					<p class="font-medium text-lg">No Link Report Available</p>
					<p class="text-sm max-w-md mt-2">
						Run the link checker to verify that all links are working and ensure no links have dropped between versions.
					</p>
					<Button class="mt-6" onclick={() => handleButtonClick('linkcheck')}>
						<PlayIcon class="mr-2 h-4 w-4" />
						Run Link Check
					</Button>
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
