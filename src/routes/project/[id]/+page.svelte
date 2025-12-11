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
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isRunning = $state(false);
	let runningCommand = $state<'reference' | 'test' | 'approve' | null>(null);

	let project = $derived(data.project);
	let report = $derived(data.report);
	let hasReport = $derived(report !== null);
	let hasReference = $derived(data.hasReference);
	let reportUrl = $derived(project ? `/report/${project.id}/html_report/index.html` : '');

	function confirmReference(): boolean {
		return confirm(
			'Replace Existing Reference?\n\n' +
			'This will replace the existing reference screenshots with new ones from the Canonical URL.\n\n' +
			'Only do this if:\n' +
			'• The original reference was broken or incorrect\n\n' +
			'If you have valid test failures, use "Approve All Changes" instead to update the baseline.'
		);
	}

	function confirmApprove(): boolean {
		return confirm(
			'Approve All Changes?\n\n' +
			'This will set the current test screenshots as the new baseline reference.\n\n' +
			'Only approve if you have reviewed the differences and confirmed that all visual changes are intentional and correct.\n\n' +
			'This action cannot be undone.'
		);
	}
</script>

<div class="flex-1 flex flex-col overflow-hidden">
	<!-- Actions Bar -->
	<div class="flex items-center justify-between px-4 py-3 border-b bg-muted/20 shrink-0">
		<div class="flex items-center gap-3">
			<form
				method="POST"
				action="?/run"
			use:enhance={({ formData, cancel }) => {
				const cmd = formData.get('command') as 'reference' | 'test' | 'approve';
				
				if (cmd === 'reference' && hasReference && !confirmReference()) {
					cancel();
					return;
				}
				if (cmd === 'approve' && !confirmApprove()) {
					cancel();
					return;
				}
				
				isRunning = true;
				runningCommand = cmd;
				return async ({ update }) => {
					await update();
					isRunning = false;
					runningCommand = null;
				};
			}}
				class="flex items-center gap-2"
			>
				<Button
					type="submit"
					name="command"
					value="reference"
					disabled={isRunning}
					variant="secondary"
					size="sm"
					class="cursor-pointer disabled:cursor-not-allowed"
				>
					{#if runningCommand === 'reference'}
						<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
					{:else}
						<EyeIcon class="mr-1.5 h-3.5 w-3.5" />
					{/if}
					Create New Reference
				</Button>

				<Button
					type="submit"
					name="command"
					value="test"
					disabled={isRunning}
					size="sm"
					class="cursor-pointer disabled:cursor-not-allowed"
				>
					{#if runningCommand === 'test'}
						<Loader2Icon class="mr-1.5 h-3.5 w-3.5 animate-spin" />
					{:else}
						<PlayIcon class="mr-1.5 h-3.5 w-3.5" />
					{/if}
					Run Test
				</Button>

				<Button
					type="submit"
					name="command"
					value="approve"
					disabled={isRunning}
					variant="outline"
					size="sm"
					class="cursor-pointer disabled:cursor-not-allowed hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50"
				>
					{#if runningCommand === 'approve'}
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

			{#if form?.success === false}
				<Badge variant="destructive" class="text-xs">
					Error: {form.error || 'Failed'}
				</Badge>
			{/if}
			{#if form?.success === true}
				<Badge variant="outline" class="text-xs border-green-500/50 text-green-500">
					{form.command} completed
				</Badge>
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
