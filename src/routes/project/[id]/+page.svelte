<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Pencil, Trash2, Check, X, Plus, Play, Eye, FileCheck, Loader2 } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
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

	export let data: PageData;
	export let form: ActionData;

	let isRunning = false;
	// Track which specific command is running
	let runningCommand: 'reference' | 'test' | 'approve' | null = null;

	let isEditingTitle = false;
	let newPath = '';

	$: project = data.project;
	$: report = data.report;
	$: hasReport = report !== null;
	$: reportUrl = project ? `/report/${project.id}/html_report/index.html` : '';

	// Function to add a path locally before saving
	function addPath() {
		if (newPath.trim()) {
			project.paths = [...project.paths, newPath.trim()];
			newPath = '';
			submitConfig();
		}
	}

	function removePath(index: number) {
		project.paths = project.paths.filter((_, i) => i !== index);
		submitConfig();
	}

	function submitConfig() {
		// Use a timeout to allow UI update before submission (and debouncing if we added text input saves later)
		setTimeout(() => {
			document.forms.namedItem('configForm')?.requestSubmit();
		}, 0);
	}
</script>

<div class="px-4 pt-4 space-y-4 h-screen flex flex-col">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
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
						<input type="hidden" name="name" value={project.name} />
						<input type="hidden" name="canonicalBaseUrl" value={project.canonicalBaseUrl} />
						<input type="hidden" name="candidateBaseUrl" value={project.candidateBaseUrl} />
						<input type="hidden" name="paths" value={project.paths.join('\n')} />

						<Input
							name="name"
							bind:value={project.name}
							class="h-8 w-64 text-lg font-bold"
							autofocus
						/>
						<Button
							size="icon"
							variant="ghost"
							type="submit"
							class="h-8 w-8 text-green-600 cursor-pointer"
						>
							<Check class="h-4 w-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							type="button"
							onclick={() => (isEditingTitle = false)}
							class="h-8 w-8 text-red-600 cursor-pointer"
						>
							<X class="h-4 w-4" />
						</Button>
					</form>
				{:else}
					<h1 class="text-3xl font-bold tracking-tight">{project.name}</h1>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => (isEditingTitle = true)}
						class="opacity-50 hover:opacity-100 cursor-pointer"
					>
						<Pencil class="h-4 w-4" />
					</Button>
				{/if}
			</div>
		</div>

		<div class="flex items-center gap-4">
			{#if isRunning}
				<Badge variant="outline" class="animate-pulse bg-blue-50 text-blue-700 border-blue-200">
					<Loader2 class="h-3 w-3 mr-1 animate-spin" />
					Running BackstopJS...
				</Badge>
			{/if}
			<a
				href="/"
				class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
				>Back &rarr;</a
			>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-12 flex-1 min-h-0">
		<!-- Configuration Column -->
		<div class="lg:col-span-4 space-y-6 flex flex-col h-full overflow-y-auto pr-1">
			<Card>
				<CardHeader>
					<CardTitle>Configuration</CardTitle>
					<CardDescription>Manage URLs and test paths.</CardDescription>
				</CardHeader>
				<CardContent>
					<form method="POST" action="?/update" use:enhance id="configForm" class="space-y-6">
						<input type="hidden" name="name" value={project.name} />
						<input type="hidden" name="paths" value={project.paths.join('\n')} />

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label
									for="canonicalBaseUrl"
									class="text-xs uppercase tracking-wide text-muted-foreground font-bold"
									>Canonical (A)</Label
								>
								<Input
									type="url"
									id="canonicalBaseUrl"
									name="canonicalBaseUrl"
									bind:value={project.canonicalBaseUrl}
									onchange={submitConfig}
									placeholder="https://production.com"
									required
								/>
								<p class="text-[0.8rem] text-muted-foreground">Reference version</p>
							</div>

							<div class="space-y-2">
								<Label
									for="candidateBaseUrl"
									class="text-xs uppercase tracking-wide text-muted-foreground font-bold"
									>Candidate (B)</Label
								>
								<Input
									type="url"
									id="candidateBaseUrl"
									name="candidateBaseUrl"
									bind:value={project.candidateBaseUrl}
									onchange={submitConfig}
									placeholder="https://staging.com"
									required
								/>
								<p class="text-[0.8rem] text-muted-foreground">Version to test</p>
							</div>
						</div>

						<Separator />

						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<Label class="text-xs uppercase tracking-wide text-muted-foreground font-bold"
									>Test Paths</Label
								>
								<span class="text-xs text-muted-foreground">{project.paths.length} paths</span>
							</div>

							<div class="rounded-md border max-h-60 overflow-y-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead class="w-full">Path</TableHead>
											<TableHead class="w-[50px]"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{#each project.paths as path, i}
											<TableRow>
												<TableCell class="font-mono text-xs py-2">{path}</TableCell>
												<TableCell class="py-2">
													<Button
														variant="ghost"
														size="icon"
														class="h-6 w-6 text-muted-foreground hover:text-red-600 cursor-pointer"
														onclick={() => removePath(i)}
													>
														<X class="h-3 w-3" />
													</Button>
												</TableCell>
											</TableRow>
										{/each}
										<TableRow>
											<TableCell class="p-2">
												<Input
													placeholder="/new-path"
													bind:value={newPath}
													class="h-8 font-mono text-xs border-dashed focus:border-solid bg-transparent"
													onkeydown={(e) => {
														if (e.key === 'Enter') {
															e.preventDefault();
															addPath();
														}
													}}
												/>
											</TableCell>
											<TableCell class="p-2">
												<Button
													size="icon"
													variant="ghost"
													class="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
													onclick={addPath}
													disabled={!newPath.trim()}
												>
													<Plus class="h-4 w-4" />
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
				<CardHeader>
					<CardTitle>Actions</CardTitle>
					<CardDescription>Run regression tests.</CardDescription>
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
						class="space-y-4"
					>
						<div class="relative">
							<div class="absolute left-3 top-3 bottom-3 w-0.5 bg-muted"></div>

							<div class="relative flex items-center gap-4 mb-4 pl-8">
								<div
									class="absolute left-0 w-6 h-6 rounded-full bg-muted border flex items-center justify-center text-xs font-bold text-muted-foreground"
								>
									1
								</div>
								<Button
									type="submit"
									name="command"
									value="reference"
									disabled={isRunning}
									variant="secondary"
									class="w-full justify-start cursor-pointer hover:bg-secondary/80 disabled:cursor-not-allowed"
								>
									{#if runningCommand === 'reference'}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{:else}
										<Eye class="mr-2 h-4 w-4" />
									{/if}
									Create Reference
								</Button>
							</div>

							<div class="relative flex items-center gap-4 mb-4 pl-8">
								<div
									class="absolute left-0 w-6 h-6 rounded-full bg-blue-100 border-blue-200 border flex items-center justify-center text-xs font-bold text-blue-600"
								>
									2
								</div>
								<Button
									type="submit"
									name="command"
									value="test"
									disabled={isRunning}
									class="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white cursor-pointer disabled:cursor-not-allowed"
								>
									{#if runningCommand === 'test'}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{:else}
										<Play class="mr-2 h-4 w-4" />
									{/if}
									Run Test
								</Button>
							</div>

							<div class="relative flex items-center gap-4 pl-8">
								<div
									class="absolute left-0 w-6 h-6 rounded-full bg-green-100 border-green-200 border flex items-center justify-center text-xs font-bold text-green-600"
								>
									3
								</div>
								<Button
									type="submit"
									name="command"
									value="approve"
									disabled={isRunning}
									variant="outline"
									class="w-full justify-start hover:bg-green-50 hover:text-green-700 hover:border-green-200 cursor-pointer disabled:cursor-not-allowed"
								>
									{#if runningCommand === 'approve'}
										<Loader2 class="mr-2 h-4 w-4 animate-spin" />
									{:else}
										<FileCheck class="mr-2 h-4 w-4" />
									{/if}
									Approve Changes
								</Button>
							</div>
						</div>

						<div class="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
							<strong>Tip:</strong> "Approve Changes" promotes the latest test screenshots (B) to be the
							new reference bitmaps (A). Use this when valid UI changes are detected.
						</div>

						{#if form?.success === false}
							<div class="text-sm font-medium text-destructive mt-2 bg-destructive/10 p-2 rounded">
								Error: {form.error || 'Operation failed'}
							</div>
						{/if}
						{#if form?.success === true}
							<div class="text-sm font-medium text-green-600 mt-2 bg-green-50 p-2 rounded">
								{#if form.command}
									Command '{form.command}' completed successfully.
								{/if}
							</div>
						{/if}
					</form>
				</CardContent>
			</Card>
		</div>

		<!-- Results Column -->
		<div class="lg:col-span-8 flex flex-col h-full min-h-0">
			<Card class="flex-1 flex flex-col overflow-hidden h-full py-0 gap-0">
				{#if hasReport}
					<div
						class="flex items-center justify-between px-4 py-2 border-b bg-muted/20 shrink-0 h-10"
					>
						<div class="text-xs text-muted-foreground flex items-center gap-2">
							{#if project.lastRun}
								<span class="font-medium">Last run:</span>
								{formatDistanceToNow(new Date(project.lastRun), { addSuffix: true })}
							{/if}
						</div>
						<Button
							variant="ghost"
							size="sm"
							class="h-6 text-xs cursor-pointer"
							href={reportUrl}
							target="_blank"
						>
							Open in new tab &nearr;
						</Button>
					</div>
				{/if}

				<div class="flex-1 bg-muted/10 relative">
					{#if hasReport}
						<iframe
							src={reportUrl}
							title="BackstopJS Report"
							class="absolute inset-0 w-full h-full border-0"
						></iframe>
					{:else}
						<div
							class="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8 text-center"
						>
							<div class="rounded-full bg-muted p-4 mb-4">
								<Play class="h-8 w-8 opacity-20" />
							</div>
							<p class="font-medium">No report available</p>
							<p class="text-sm">Run a test to generate the visual regression report.</p>
							{#if form?.command === 'reference' && form?.success}
								<p class="text-xs text-green-600 mt-2">
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
