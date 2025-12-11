<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import PlayIcon from '@lucide/svelte/icons/play';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import FileCheckIcon from '@lucide/svelte/icons/file-check';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { formatDistanceToNow } from 'date-fns';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isRunning = $state(false);
	let runningCommand = $state<'reference' | 'test' | 'approve' | null>(null);
	let isEditingTitle = $state(false);
	let newPath = $state('');

	let project = $derived(data.project);
	let report = $derived(data.report);
	let hasReport = $derived(report !== null);
	let reportUrl = $derived(project ? `/report/${project.id}/html_report/index.html` : '');

	function addPath() {
		if (newPath.trim()) {
			data.project.paths = [...data.project.paths, newPath.trim()];
			newPath = '';
			submitConfig();
		}
	}

	function removePath(index: number) {
		data.project.paths = data.project.paths.filter((_, i) => i !== index);
		submitConfig();
	}

	function submitConfig() {
		setTimeout(() => {
			document.forms.namedItem('configForm')?.requestSubmit();
		}, 0);
	}
</script>

<div class="flex-1 flex flex-col overflow-hidden p-4 gap-4">
	<!-- Header -->
	<div class="flex items-center justify-between shrink-0">
		<div class="flex items-center gap-2">
			{#if isEditingTitle}
				<form
					action="?/update"
					method="POST"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							isEditingTitle = false;
						};
					}}
					class="flex items-center gap-2"
				>
					<input type="hidden" name="canonicalBaseUrl" value={project.canonicalBaseUrl} />
					<input type="hidden" name="candidateBaseUrl" value={project.candidateBaseUrl} />
					<input type="hidden" name="paths" value={project.paths.join('\n')} />
					<Input
						name="name"
						value={project.name}
						oninput={(e) => (data.project.name = e.currentTarget.value)}
						class="h-8 w-64 text-lg font-semibold"
						autofocus
					/>
					<Button size="icon" variant="ghost" type="submit" class="h-8 w-8 text-green-500 cursor-pointer">
						<CheckIcon class="h-4 w-4" />
					</Button>
					<Button
						size="icon"
						variant="ghost"
						type="button"
						onclick={() => (isEditingTitle = false)}
						class="h-8 w-8 text-destructive cursor-pointer"
					>
						<XIcon class="h-4 w-4" />
					</Button>
				</form>
			{:else}
				<h1 class="text-xl font-semibold tracking-tight">{project.name}</h1>
				<Button
					variant="ghost"
					size="icon"
					onclick={() => (isEditingTitle = true)}
					class="h-7 w-7 opacity-50 hover:opacity-100 cursor-pointer"
				>
					<PencilIcon class="h-3.5 w-3.5" />
				</Button>
			{/if}
		</div>

		{#if isRunning}
			<Badge variant="outline" class="animate-pulse border-blue-500/50 text-blue-400">
				<Loader2Icon class="h-3 w-3 mr-1 animate-spin" />
				Running BackstopJS...
			</Badge>
		{/if}
	</div>

	<!-- Main content -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 min-h-0">
		<!-- Configuration Column -->
		<div class="lg:col-span-4 xl:col-span-3 space-y-4 flex flex-col overflow-y-auto pr-1">
			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-base">Configuration</CardTitle>
					<CardDescription class="text-xs">Manage URLs and test paths.</CardDescription>
				</CardHeader>
				<CardContent>
					<form method="POST" action="?/update" use:enhance id="configForm" class="space-y-4">
						<input type="hidden" name="name" value={project.name} />
						<input type="hidden" name="paths" value={project.paths.join('\n')} />

						<div class="space-y-3">
							<div class="space-y-1.5">
								<Label for="canonicalBaseUrl" class="text-xs text-muted-foreground">
									Canonical URL (A)
								</Label>
								<Input
									type="url"
									id="canonicalBaseUrl"
									name="canonicalBaseUrl"
									value={project.canonicalBaseUrl}
									oninput={(e) => (data.project.canonicalBaseUrl = e.currentTarget.value)}
									onchange={submitConfig}
									placeholder="https://production.com"
									class="h-8 text-sm font-mono"
								/>
							</div>

							<div class="space-y-1.5">
								<Label for="candidateBaseUrl" class="text-xs text-muted-foreground">
									Candidate URL (B)
								</Label>
								<Input
									type="url"
									id="candidateBaseUrl"
									name="candidateBaseUrl"
									value={project.candidateBaseUrl}
									oninput={(e) => (data.project.candidateBaseUrl = e.currentTarget.value)}
									onchange={submitConfig}
									placeholder="https://staging.com"
									class="h-8 text-sm font-mono"
								/>
							</div>
						</div>

						<Separator />

						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label class="text-xs text-muted-foreground">Test Paths</Label>
								<span class="text-xs text-muted-foreground">{project.paths.length}</span>
							</div>

							<div class="rounded-md border max-h-48 overflow-y-auto">
								<Table>
									<TableBody>
										{#each project.paths as path, i}
											<TableRow class="hover:bg-muted/50">
												<TableCell class="font-mono text-xs py-1.5 px-2">{path}</TableCell>
												<TableCell class="py-1.5 px-1 w-8">
													<Button
														variant="ghost"
														size="icon"
														class="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
														onclick={() => removePath(i)}
													>
														<XIcon class="h-3 w-3" />
													</Button>
												</TableCell>
											</TableRow>
										{/each}
										<TableRow>
											<TableCell class="p-1.5">
												<Input
													placeholder="/new-path"
													bind:value={newPath}
													class="h-7 font-mono text-xs border-dashed bg-transparent"
													onkeydown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															addPath();
														}
													}}
												/>
											</TableCell>
											<TableCell class="p-1 w-8">
												<Button
													size="icon"
													variant="ghost"
													class="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
													onclick={addPath}
													disabled={!newPath.trim()}
												>
													<PlusIcon class="h-3.5 w-3.5" />
												</Button>
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-3">
					<CardTitle class="text-base">Actions</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						method="POST"
						action="?/run"
						use:enhance={({ formData }) => {
							const cmd = formData.get('command') as 'reference' | 'test' | 'approve';
							isRunning = true;
							runningCommand = cmd;
							return async ({ update }) => {
								await update();
								isRunning = false;
								runningCommand = null;
							};
						}}
						class="space-y-2"
					>
						<Button
							type="submit"
							name="command"
							value="reference"
							disabled={isRunning}
							variant="secondary"
							class="w-full justify-start h-9 cursor-pointer disabled:cursor-not-allowed"
						>
							{#if runningCommand === 'reference'}
								<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<EyeIcon class="mr-2 h-4 w-4" />
							{/if}
							<span class="flex-1 text-left">Create Reference</span>
							<Badge variant="outline" class="text-[10px] px-1.5 py-0">1</Badge>
						</Button>

						<Button
							type="submit"
							name="command"
							value="test"
							disabled={isRunning}
							class="w-full justify-start h-9 cursor-pointer disabled:cursor-not-allowed"
						>
							{#if runningCommand === 'test'}
								<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<PlayIcon class="mr-2 h-4 w-4" />
							{/if}
							<span class="flex-1 text-left">Run Test</span>
							<Badge variant="outline" class="text-[10px] px-1.5 py-0 border-primary-foreground/30">2</Badge>
						</Button>

						<Button
							type="submit"
							name="command"
							value="approve"
							disabled={isRunning}
							variant="outline"
							class="w-full justify-start h-9 cursor-pointer disabled:cursor-not-allowed hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50"
						>
							{#if runningCommand === 'approve'}
								<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<FileCheckIcon class="mr-2 h-4 w-4" />
							{/if}
							<span class="flex-1 text-left">Approve Changes</span>
							<Badge variant="outline" class="text-[10px] px-1.5 py-0">3</Badge>
						</Button>

						{#if form?.success === false}
							<div class="text-xs text-destructive bg-destructive/10 p-2 rounded mt-2">
								Error: {form.error || 'Operation failed'}
							</div>
						{/if}
						{#if form?.success === true}
							<div class="text-xs text-green-500 bg-green-500/10 p-2 rounded mt-2">
								{form.command} completed successfully.
							</div>
						{/if}
					</form>
				</CardContent>
			</Card>
		</div>

		<!-- Results Column -->
		<div class="lg:col-span-8 xl:col-span-9 flex flex-col min-h-0">
			<Card class="flex-1 flex flex-col overflow-hidden p-0">
				{#if hasReport}
					<div class="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
						<div class="text-xs text-muted-foreground flex items-center gap-2">
							{#if project.lastRun}
								<span>Last run:</span>
								<span class="font-medium">{formatDistanceToNow(new Date(project.lastRun), { addSuffix: true })}</span>
							{/if}
						</div>
						<Button variant="ghost" size="sm" class="h-6 text-xs cursor-pointer" href={reportUrl} target="_blank">
							<ExternalLinkIcon class="h-3 w-3 mr-1" />
							Open in new tab
						</Button>
					</div>
				{/if}

				<div class="flex-1 bg-muted/5 relative">
					{#if hasReport}
						<iframe src={reportUrl} title="BackstopJS Report" class="absolute inset-0 w-full h-full border-0"></iframe>
					{:else}
						<div class="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
							<div class="rounded-full bg-muted p-4 mb-4">
								<PlayIcon class="h-8 w-8 opacity-20" />
							</div>
							<p class="font-medium">No report available</p>
							<p class="text-sm">Run a test to generate the visual regression report.</p>
							{#if form?.command === 'reference' && form?.success}
								<p class="text-xs text-green-500 mt-2">
									Reference created! Now run "Run Test" to compare.
								</p>
							{/if}
						</div>
					{/if}
				</div>
			</Card>
		</div>
	</div>
</div>
