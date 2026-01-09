<script lang="ts">
	import type { PageData } from './$types';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex-1 overflow-auto p-6">
	<h1 class="text-xl font-semibold mb-4">Passing Paths ({data.passing.length})</h1>

	{#if data.passing.length === 0}
		<p class="text-muted-foreground">No passing tests yet. Run some tests first.</p>
	{:else}
		<div class="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Project</TableHead>
						<TableHead>URL Pair</TableHead>
						<TableHead>Path</TableHead>
						<TableHead>Viewport</TableHead>
						<TableHead>URLs</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.passing as p}
						<TableRow>
							<TableCell>
								<a href="/project/{p.projectId}?pair={p.pairId}" class="text-blue-600 hover:underline">
									{p.projectName}
								</a>
							</TableCell>
							<TableCell>
								<Badge variant="secondary" class="text-xs font-mono">{p.pairDisplay}</Badge>
							</TableCell>
							<TableCell class="font-mono text-sm">{p.path}</TableCell>
							<TableCell>
								<Badge variant="outline">{p.viewport}</Badge>
							</TableCell>
							<TableCell class="space-x-2">
								<a href={p.referenceUrl} target="_blank" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
									ref <ExternalLinkIcon class="h-3 w-3" />
								</a>
								<a href={p.url} target="_blank" class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
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

