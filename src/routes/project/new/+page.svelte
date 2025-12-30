<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import ListIcon from '@lucide/svelte/icons/list';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Tabs from '$lib/components/ui/tabs';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state('');
	let pathsText = $state('/');
	let newPath = $state('');
	let delay = $state(0);
	let clickSelector = $state('');
	let postInteractionWait = $state(500);
	let hideSelectorsText = $state('');

	let pathsList = $derived(
		pathsText
			.split('\n')
			.map((p) => p.trim())
			.filter((p) => p)
	);

	function addPath() {
		const trimmed = newPath.trim();
		if (trimmed && !pathsList.includes(trimmed)) {
			pathsText = pathsText.trim() ? `${pathsText}\n${trimmed}` : trimmed;
			newPath = '';
		}
	}

	function removePath(pathToRemove: string) {
		pathsText = pathsList.filter((p) => p !== pathToRemove).join('\n');
	}

	function getOtherProjects(path: string): string[] {
		return data.pathMap[path] || [];
	}
</script>

<div class="flex-1 overflow-auto p-6">
	<form method="POST" use:enhance class="space-y-6">
		<div class="space-y-2">
			<Label for="name" class="text-xs uppercase tracking-wide text-muted-foreground"
				>Project Name</Label
			>
			<Input
				id="name"
				name="name"
				bind:value={name}
				placeholder="e.g., Marketing Website"
				class="text-2xl font-semibold"
				required
			/>
		</div>

		<Card>
			<CardHeader>
				<CardTitle class="text-base">Test Paths</CardTitle>
				<CardDescription>
					Define the paths to test. These are appended to the URL pair you select when running
					tests.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs.Root value="list" class="w-full">
					<Tabs.List class="mb-4">
						<Tabs.Trigger value="list" class="flex items-center gap-1.5">
							<ListIcon class="h-3.5 w-3.5" />
							List
						</Tabs.Trigger>
						<Tabs.Trigger value="text" class="flex items-center gap-1.5">
							<FileTextIcon class="h-3.5 w-3.5" />
							Plaintext
						</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="list" class="space-y-3">
						<div class="flex gap-2">
							<Input
								bind:value={newPath}
								placeholder="/new-path"
								class="font-mono text-sm"
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										addPath();
									}
								}}
							/>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onclick={addPath}
								disabled={!newPath.trim() || pathsList.includes(newPath.trim())}
							>
								<PlusIcon class="h-4 w-4" />
							</Button>
						</div>

						{#if pathsList.length > 0}
							<div class="rounded-md border divide-y">
								{#each pathsList as path}
									{@const otherProjects = getOtherProjects(path)}
									<div
										class="flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
									>
										<div class="flex items-center gap-2 min-w-0">
											<code class="text-sm font-mono truncate">{path}</code>
											{#if otherProjects.length > 0}
												<Tooltip.Provider>
													<Tooltip.Root>
														<Tooltip.Trigger>
															<Badge variant="outline" class="text-xs text-amber-600 border-amber-600/30">
																<AlertCircleIcon class="h-3 w-3 mr-1" />
																{otherProjects.length}
															</Badge>
														</Tooltip.Trigger>
														<Tooltip.Content>
															<p class="text-xs">
																Also tested by: {otherProjects.join(', ')}
															</p>
														</Tooltip.Content>
													</Tooltip.Root>
												</Tooltip.Provider>
											{/if}
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											class="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
											onclick={() => removePath(path)}
										>
											<XIcon class="h-3.5 w-3.5" />
										</Button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
								No paths added yet
							</div>
						{/if}

						<p class="text-xs text-muted-foreground">
							{pathsList.length} path{pathsList.length === 1 ? '' : 's'}
						</p>
					</Tabs.Content>

					<Tabs.Content value="text">
						<Textarea
							bind:value={pathsText}
							placeholder={'/\n/about\n/contact\n/pricing'}
							rows={8}
							class="font-mono text-sm"
						/>
					</Tabs.Content>
				</Tabs.Root>

				<input type="hidden" name="paths" value={pathsText} />
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-base">Automation</CardTitle>
				<CardDescription>
					Configure timing and automatic interactions before capturing screenshots.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="delay">Delay (ms)</Label>
					<Input
						type="number"
						id="delay"
						name="delay"
						bind:value={delay}
						min="0"
						max="30000"
						class="font-mono text-sm w-32"
					/>
					<p class="text-xs text-muted-foreground">
						Time to wait after page load before any interactions (default: 0ms)
					</p>
				</div>

				<Separator />

				<div class="space-y-2">
					<Label for="clickSelector">Click Selector</Label>
					<Input
						id="clickSelector"
						name="clickSelector"
						bind:value={clickSelector}
						placeholder="#onetrust-accept-btn-handler"
						class="font-mono text-sm"
					/>
					<p class="text-xs text-muted-foreground">
						CSS selector to click before capture (e.g., cookie consent button)
					</p>
				</div>

				<Separator />

				<div class="space-y-2">
					<Label for="postInteractionWait">Post-Interaction Wait (ms)</Label>
					<Input
						type="number"
						id="postInteractionWait"
						name="postInteractionWait"
						bind:value={postInteractionWait}
						min="0"
						max="10000"
						class="font-mono text-sm w-32"
					/>
					<p class="text-xs text-muted-foreground">
						Time to wait after clicking before capturing (default: 500ms)
					</p>
				</div>

				<Separator />

				<div class="space-y-2">
					<Label for="hideSelectors">Hide Selectors</Label>
					<Textarea
						id="hideSelectors"
						name="hideSelectors"
						bind:value={hideSelectorsText}
						placeholder={'.timestamp\n.ad-banner\n[data-testid="dynamic-content"]'}
						rows={4}
						class="font-mono text-sm"
					/>
					<p class="text-xs text-muted-foreground">
						CSS selectors to hide before capture (one per line). Use for dynamic content like timestamps, ads, or counters that change between runs.
					</p>
				</div>
			</CardContent>
		</Card>

		{#if form?.error}
			<div class="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
				{form.error}
			</div>
		{/if}

		<div class="flex justify-end gap-3">
			<Button variant="outline" type="button" href="/">Cancel</Button>
			<Button type="submit" disabled={!name.trim() || pathsList.length === 0}>Create Project</Button>
		</div>
	</form>
</div>
