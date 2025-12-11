<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Plus, X, Monitor, Smartphone, Tablet, Settings, Laptop, Tv, Watch } from 'lucide-svelte';
	import type { Viewport, ViewportIcon } from '$lib/types';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import * as Select from '$lib/components/ui/select';

	export let data: PageData;
	export let form: ActionData;

	let viewports: Viewport[] = [...data.settings.viewports];
	let newLabel = '';
	let newWidth = 1280;
	let newHeight = 800;
	let newIcon: ViewportIcon = 'monitor';
	let formEl: HTMLFormElement;

	const iconOptions: { value: ViewportIcon; label: string; icon: typeof Monitor }[] = [
		{ value: 'monitor', label: 'Monitor', icon: Monitor },
		{ value: 'laptop', label: 'Laptop', icon: Laptop },
		{ value: 'tablet', label: 'Tablet', icon: Tablet },
		{ value: 'smartphone', label: 'Smartphone', icon: Smartphone },
		{ value: 'tv', label: 'TV', icon: Tv },
		{ value: 'watch', label: 'Watch', icon: Watch }
	];

	function submitForm() {
		setTimeout(() => formEl?.requestSubmit(), 0);
	}

	function addViewport() {
		if (newLabel.trim() && newWidth >= 100 && newHeight >= 100) {
			viewports = [
				...viewports,
				{ label: newLabel.trim(), width: newWidth, height: newHeight, icon: newIcon }
			];
			newLabel = '';
			newWidth = 1280;
			newHeight = 800;
			newIcon = 'monitor';
			submitForm();
		}
	}

	function removeViewport(index: number) {
		viewports = viewports.filter((_, i) => i !== index);
		submitForm();
	}

	function gcd(a: number, b: number): number {
		a = Math.abs(Math.round(a));
		b = Math.abs(Math.round(b));
		while (b) {
			const t = b;
			b = a % b;
			a = t;
		}
		return a;
	}

	function computeAspectRatio(width: number, height: number): string {
		if (width <= 0 || height <= 0) return '—';
		const divisor = gcd(width, height);
		const w = width / divisor;
		const h = height / divisor;
		return `${w}:${h}`;
	}

	$: currentAspectRatio = computeAspectRatio(newWidth, newHeight);

	function getIconComponent(iconName?: ViewportIcon) {
		const option = iconOptions.find((o) => o.value === iconName);
		return option?.icon || Monitor;
	}
</script>

<div class="container mx-auto max-w-3xl p-8 space-y-8">
	<div class="flex items-center justify-between">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
				<Settings class="h-8 w-8 text-muted-foreground" />
				Settings
			</h1>
			<p class="text-muted-foreground">
				Configure global settings for all visual regression tests.
			</p>
		</div>
		<a
			href="/"
			class="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
		>
			Back &rarr;
		</a>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Viewports</CardTitle>
			<CardDescription>
				Define the screen sizes used for all visual regression tests. These viewports apply globally
				to every project.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/save" use:enhance bind:this={formEl} class="space-y-4">
				<input type="hidden" name="viewports" value={JSON.stringify(viewports)} />

				<div class="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="w-[80px]">Icon</TableHead>
								<TableHead>Label</TableHead>
								<TableHead class="w-[100px]">Width</TableHead>
								<TableHead class="w-[100px]">Height</TableHead>
								<TableHead class="w-[80px]">Ratio</TableHead>
								<TableHead class="w-[50px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each viewports as viewport, i}
								{@const Icon = getIconComponent(viewport.icon)}
								<TableRow>
									<TableCell>
										<div
											class="w-[70px] h-8 flex items-center justify-center rounded-md border bg-muted/30"
										>
											<Icon class="h-4 w-4 text-muted-foreground" />
										</div>
									</TableCell>
									<TableCell class="font-medium">{viewport.label}</TableCell>
									<TableCell>
										<Badge variant="outline" class="font-mono">
											{viewport.width}px
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant="outline" class="font-mono">
											{viewport.height}px
										</Badge>
									</TableCell>
									<TableCell>
										<span class="text-xs text-muted-foreground font-mono">
											{computeAspectRatio(viewport.width, viewport.height)}
										</span>
									</TableCell>
									<TableCell>
										<Button
											variant="ghost"
											size="icon"
											type="button"
											class="h-6 w-6 text-muted-foreground hover:text-red-600 cursor-pointer"
											onclick={() => removeViewport(i)}
											disabled={viewports.length <= 1}
										>
											<X class="h-3 w-3" />
										</Button>
									</TableCell>
								</TableRow>
							{/each}

							<!-- Add new viewport row -->
							<TableRow class="bg-muted/30">
								<TableCell>
									<Select.Root
										type="single"
										value={newIcon}
										onValueChange={(v) => (newIcon = v as ViewportIcon)}
									>
										<Select.Trigger class="w-[70px] h-8">
											{@const NewIcon = getIconComponent(newIcon)}
											<NewIcon class="h-4 w-4" />
										</Select.Trigger>
										<Select.Content>
											{#each iconOptions as option}
												<Select.Item value={option.value}>
													<div class="flex items-center gap-2">
														<option.icon class="h-4 w-4" />
														{option.label}
													</div>
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</TableCell>
								<TableCell>
									<Input
										placeholder="e.g. tablet"
										bind:value={newLabel}
										class="h-8 bg-white"
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addViewport();
											}
										}}
									/>
								</TableCell>
								<TableCell>
									<Input
										type="number"
										bind:value={newWidth}
										min="100"
										class="h-8 bg-white font-mono text-sm w-20"
									/>
								</TableCell>
								<TableCell>
									<Input
										type="number"
										bind:value={newHeight}
										min="100"
										class="h-8 bg-white font-mono text-sm w-20"
									/>
								</TableCell>
								<TableCell>
									<span class="text-sm font-mono font-semibold">
										{currentAspectRatio}
									</span>
								</TableCell>
								<TableCell>
									<Button
										variant="ghost"
										size="icon"
										type="button"
										class="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
										onclick={addViewport}
										disabled={!newLabel.trim() || newWidth < 100 || newHeight < 100}
									>
										<Plus class="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>

				<div class="text-xs text-muted-foreground">
					{viewports.length} viewport{viewports.length === 1 ? '' : 's'} configured
				</div>

				{#if form?.success === false}
					<div class="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded">
						Error: {form.error}
					</div>
				{/if}
			</form>
		</CardContent>
	</Card>
</div>
