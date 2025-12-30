<script lang="ts">
	import type { PageData } from './$types';
	import { formatDistanceToNow } from 'date-fns';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import ActivityIcon from '@lucide/svelte/icons/activity';

	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex-1 overflow-auto p-4">
	{#if data.recentRuns.length === 0}
		<Card class="border-dashed">
			<CardContent class="flex flex-col items-center justify-center py-12 text-center">
				<div class="rounded-full bg-muted p-4 mb-4">
					<ActivityIcon class="h-8 w-8 text-muted-foreground opacity-50" />
				</div>
				<h3 class="font-medium mb-1">No test runs yet</h3>
				<p class="text-sm text-muted-foreground max-w-sm">
					Create a project and run your first visual regression test to see results here.
				</p>
				<Button href="/project/new" class="mt-4">Create Project</Button>
			</CardContent>
		</Card>
	{:else}
		<div class="rounded-lg border overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-muted/50 border-b">
					<tr>
						<th class="text-left font-medium text-muted-foreground px-4 py-2 w-8"></th>
						<th class="text-left font-medium text-muted-foreground px-4 py-2">Project</th>
						<th class="text-left font-medium text-muted-foreground px-4 py-2">URL Pair</th>
						<th class="text-left font-medium text-muted-foreground px-4 py-2">Status</th>
						<th class="text-left font-medium text-muted-foreground px-4 py-2">Tests</th>
						<th class="text-left font-medium text-muted-foreground px-4 py-2">When</th>
						<th class="text-left font-medium text-muted-foreground px-4 py-2 w-24">Results</th>
					</tr>
				</thead>
				<tbody class="divide-y">
					{#each data.recentRuns as run}
						{@const allPassed = run.failedTests === 0}
						<tr class="hover:bg-muted/30 transition-colors">
							<td class="px-4 py-2">
								{#if allPassed}
									<CheckCircleIcon class="h-4 w-4 text-green-500" />
								{:else}
									<XCircleIcon class="h-4 w-4 text-destructive" />
								{/if}
							</td>
							<td class="px-4 py-2">
								<a href="/project/{run.projectId}?pair={run.pairId}" class="font-medium hover:text-primary hover:underline">
									{run.projectName}
								</a>
							</td>
							<td class="px-4 py-2">
								<Badge variant="secondary" class="text-xs font-mono">{run.pairDisplay}</Badge>
							</td>
							<td class="px-4 py-2">
								{#if allPassed}
									<Badge variant="outline" class="text-green-500 border-green-500/30 text-xs">
										Passed
									</Badge>
								{:else}
									<Badge variant="destructive" class="text-xs">
										{run.failedTests} Failed
									</Badge>
								{/if}
							</td>
							<td class="px-4 py-2 text-muted-foreground">
								{run.totalTests}
							</td>
							<td class="px-4 py-2 text-muted-foreground">
								{formatDistanceToNow(new Date(run.lastRun), { addSuffix: true })}
							</td>
							<td class="px-4 py-2">
								<div class="flex items-center gap-0.5">
									{#each run.tests.slice(0, 8) as test}
										<div
											class="w-1.5 h-4 rounded-sm {test.status === 'pass' ? 'bg-green-500' : 'bg-destructive'}"
											title="{test.label} ({test.viewport}): {test.status}{test.mismatch ? ` - ${test.mismatch}% mismatch` : ''}"
										></div>
									{/each}
									{#if run.tests.length > 8}
										<span class="text-xs text-muted-foreground ml-1">+{run.tests.length - 8}</span>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
