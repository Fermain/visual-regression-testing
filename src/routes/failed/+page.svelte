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
	<h1 class="text-xl font-semibold mb-4">Failed Paths ({data.failed.length})</h1>

	{#if data.failed.length === 0}
		<p class="text-muted-foreground">All tests passing.</p>
	{:else}
		<div class="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Project</TableHead>
						<TableHead>URL Pair</TableHead>
						<TableHead>Path</TableHead>
						<TableHead>Viewport</TableHead>
						<TableHead class="text-right">Diff %</TableHead>
						<TableHead>URLs</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each data.failed as f}
						<TableRow>
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

