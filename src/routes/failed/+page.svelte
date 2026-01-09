<script lang="ts">
	import type { PageData } from './$types';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';

	let { data }: { data: PageData } = $props();

	let selected = $state<Set<number>>(new Set());
	let dialogOpen = $state(false);
	let projectName = $state('Failed Paths Retest');

	let allSelected = $derived(data.failed.length > 0 && selected.size === data.failed.length);
	let someSelected = $derived(selected.size > 0 && selected.size < data.failed.length);

	function toggleAll() {
		if (allSelected) {
			selected = new Set();
		} else {
			selected = new Set(data.failed.map((_, i) => i));
		}
	}

	function toggleOne(index: number) {
		const newSet = new Set(selected);
		if (newSet.has(index)) {
			newSet.delete(index);
		} else {
			newSet.add(index);
		}
		selected = newSet;
	}

	let selectedPaths = $derived(
		[...selected].map((i) => data.failed[i].path)
	);

	let uniqueSelectedPaths = $derived([...new Set(selectedPaths)]);

	let sourceProjectId = $derived(() => {
		if (selected.size === 0) return null;
		const firstIdx = [...selected][0];
		return data.failed[firstIdx]?.projectId ?? null;
	});
</script>

<div class="flex-1 overflow-auto p-6">
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-xl font-semibold">Failed Paths ({data.failed.length})</h1>
		{#if selected.size > 0}
			<Button onclick={() => (dialogOpen = true)} size="sm">
				<PlusIcon class="h-4 w-4 mr-2" />
				Create Project from {selected.size} Selected ({uniqueSelectedPaths.length} unique paths)
			</Button>
		{/if}
	</div>

	{#if data.failed.length === 0}
		<p class="text-muted-foreground">All tests passing.</p>
	{:else}
		<div class="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead class="w-12">
							<Checkbox
								checked={allSelected}
								indeterminate={someSelected}
								onCheckedChange={toggleAll}
							/>
						</TableHead>
						<TableHead>Project</TableHead>
						<TableHead>URL Pair</TableHead>
						<TableHead>Path</TableHead>
						<TableHead>Viewport</TableHead>
						<TableHead class="text-right">Diff %</TableHead>
						<TableHead>URLs</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.failed as f, i}
						<TableRow class={selected.has(i) ? 'bg-muted/50' : ''}>
							<TableCell>
								<Checkbox
									checked={selected.has(i)}
									onCheckedChange={() => toggleOne(i)}
								/>
							</TableCell>
							<TableCell>
								<a href="/project/{f.projectId}?pair={f.pairId}" class="text-blue-600 hover:underline">
									{f.projectName}
								</a>
							</TableCell>
							<TableCell>
								<Badge variant="secondary" class="text-xs font-mono">{f.pairDisplay}</Badge>
							</TableCell>
							<TableCell class="font-mono text-sm">{f.path}</TableCell>
							<TableCell>
								<Badge variant="outline">{f.viewport}</Badge>
							</TableCell>
							<TableCell class="text-right font-mono text-destructive">{f.mismatch}%</TableCell>
							<TableCell class="space-x-2">
								<a href={f.referenceUrl} target="_blank" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
									ref <ExternalLinkIcon class="h-3 w-3" />
								</a>
								<a href={f.url} target="_blank" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
									test <ExternalLinkIcon class="h-3 w-3" />
								</a>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/if}
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Create Project from Failed Paths</Dialog.Title>
			<Dialog.Description>
				Create a new project containing only the {uniqueSelectedPaths.length} unique failing path{uniqueSelectedPaths.length === 1 ? '' : 's'}.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/createProject" class="space-y-4">
			<input type="hidden" name="paths" value={JSON.stringify(uniqueSelectedPaths)} />
			<input type="hidden" name="sourceProjectId" value={sourceProjectId()} />
			<div class="space-y-2">
				<Label for="project-name">Project Name</Label>
				<Input
					id="project-name"
					name="name"
					bind:value={projectName}
					placeholder="Failed Paths Retest"
				/>
			</div>
			<div class="rounded-md bg-muted p-3">
				<p class="text-sm font-medium mb-2">Paths to include:</p>
				<ul class="text-sm text-muted-foreground space-y-1 max-h-40 overflow-auto">
					{#each uniqueSelectedPaths as p}
						<li class="font-mono">{p}</li>
					{/each}
				</ul>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>
					Cancel
				</Button>
				<Button type="submit">Create Project</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

