<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import TabletIcon from '@lucide/svelte/icons/tablet';
	import LaptopIcon from '@lucide/svelte/icons/laptop';
	import TvIcon from '@lucide/svelte/icons/tv';
	import WatchIcon from '@lucide/svelte/icons/watch';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import type { Viewport, ViewportIcon, UrlPair } from '$lib/types';
	import { extractHostname } from '$lib/types';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
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

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let viewports = $state<Viewport[]>([]);
	let urlPairs = $state<UrlPair[]>([]);
	let newLabel = $state('');
	let newWidth = $state(1280);
	let newHeight = $state(800);
	let newIcon = $state<ViewportIcon>('monitor');
	let formEl = $state<HTMLFormElement | null>(null);

	// URL pair form state
	let newPairCanonical = $state('');
	let newPairCandidate = $state('');
	let pairError = $state<string | null>(null);

	let asyncCaptureLimit = $state(2);
	let asyncCompareLimit = $state(10);
	let waitTimeout = $state(120000);
	let gotoTimeout = $state(120000);

	$effect(() => {
		viewports = [...data.settings.viewports];
		urlPairs = [...(data.settings.urlPairs || [])];
		asyncCaptureLimit = data.settings.asyncCaptureLimit ?? 2;
		asyncCompareLimit = data.settings.asyncCompareLimit ?? 10;
		waitTimeout = data.settings.waitTimeout ?? 120000;
		gotoTimeout = data.settings.gotoTimeout ?? 120000;
	});

	const iconOptions: { value: ViewportIcon; label: string; icon: typeof MonitorIcon }[] = [
		{ value: 'monitor', label: 'Monitor', icon: MonitorIcon },
		{ value: 'laptop', label: 'Laptop', icon: LaptopIcon },
		{ value: 'tablet', label: 'Tablet', icon: TabletIcon },
		{ value: 'smartphone', label: 'Smartphone', icon: SmartphoneIcon },
		{ value: 'tv', label: 'TV', icon: TvIcon },
		{ value: 'watch', label: 'Watch', icon: WatchIcon }
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

	let currentAspectRatio = $derived(computeAspectRatio(newWidth, newHeight));

	function getIconComponent(iconName?: ViewportIcon) {
		const option = iconOptions.find((o) => o.value === iconName);
		return option?.icon || MonitorIcon;
	}

	function isValidUrl(urlString: string): boolean {
		try {
			const url = new URL(urlString);
			return url.protocol === 'http:' || url.protocol === 'https:';
		} catch {
			return false;
		}
	}

	function generatePairId(canonicalUrl: string, candidateUrl: string): string {
		const canonical = extractHostname(canonicalUrl).replace(/\./g, '-');
		const candidate = extractHostname(candidateUrl).replace(/\./g, '-');
		return `${canonical}-vs-${candidate}`;
	}

	// Derived validation states
	let canonicalValid = $derived(newPairCanonical.trim() === '' || isValidUrl(newPairCanonical));
	let candidateValid = $derived(newPairCandidate.trim() === '' || isValidUrl(newPairCandidate));
	let canAddPair = $derived(
		newPairCanonical.trim() !== '' &&
		newPairCandidate.trim() !== '' &&
		isValidUrl(newPairCanonical) &&
		isValidUrl(newPairCandidate)
	);

	function addUrlPair() {
		pairError = null;

		if (!newPairCanonical.trim() || !newPairCandidate.trim()) {
			pairError = 'Both URLs are required';
			return;
		}

		if (!isValidUrl(newPairCanonical)) {
			pairError = 'Reference URL is invalid. Must be a valid http:// or https:// URL';
			return;
		}

		if (!isValidUrl(newPairCandidate)) {
			pairError = 'Candidate URL is invalid. Must be a valid http:// or https:// URL';
			return;
		}

		const id = generatePairId(newPairCanonical, newPairCandidate);
		if (urlPairs.some((p) => p.id === id)) {
			pairError = 'This URL pair already exists';
			return;
		}

		urlPairs = [
			...urlPairs,
			{
				id,
				canonicalUrl: newPairCanonical.trim(),
				candidateUrl: newPairCandidate.trim()
			}
		];
		newPairCanonical = '';
		newPairCandidate = '';
		submitForm();
	}

	function removeUrlPair(index: number) {
		urlPairs = urlPairs.filter((_, i) => i !== index);
		submitForm();
	}

	function clearPairError() {
		pairError = null;
	}
</script>

<div class="flex-1 overflow-auto p-6">
	<form method="POST" action="?/save" use:enhance bind:this={formEl} class="space-y-6">
		<input type="hidden" name="viewports" value={JSON.stringify(viewports)} />
		<input type="hidden" name="urlPairs" value={JSON.stringify(urlPairs)} />

		<Card>
			<CardHeader>
				<CardTitle>URL Pairs</CardTitle>
				<CardDescription>
					Define environment pairs for visual regression testing. Each pair compares a reference URL
					(e.g., production) against a candidate URL (e.g., staging).
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="rounded-md border overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Reference (Canonical)</TableHead>
								<TableHead class="w-[40px]"></TableHead>
								<TableHead>Candidate (Test)</TableHead>
								<TableHead class="w-[40px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each urlPairs as pair, i}
								<TableRow>
									<TableCell class="py-2">
										<Badge variant="outline" class="font-mono text-xs">
											{extractHostname(pair.canonicalUrl)}
										</Badge>
									</TableCell>
									<TableCell class="py-2 text-muted-foreground">
										<ArrowRightIcon class="h-4 w-4" />
									</TableCell>
									<TableCell class="py-2">
										<Badge variant="outline" class="font-mono text-xs">
											{extractHostname(pair.candidateUrl)}
										</Badge>
									</TableCell>
									<TableCell class="py-2">
										<Button
											variant="ghost"
											size="icon"
											type="button"
											class="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
											onclick={() => removeUrlPair(i)}
										>
											<XIcon class="h-3 w-3" />
										</Button>
									</TableCell>
								</TableRow>
							{/each}

							<!-- Add new URL pair row -->
							<TableRow class="bg-muted/20">
								<TableCell class="py-2">
									<Input
										type="url"
										placeholder="https://www.example.com"
										bind:value={newPairCanonical}
										class="h-8 bg-background font-mono text-xs {!canonicalValid ? 'border-destructive focus-visible:ring-destructive' : ''}"
										oninput={clearPairError}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addUrlPair();
											}
										}}
									/>
								</TableCell>
								<TableCell class="py-2 text-muted-foreground">
									<ArrowRightIcon class="h-4 w-4" />
								</TableCell>
								<TableCell class="py-2">
									<Input
										type="url"
										placeholder="https://staging.example.com"
										bind:value={newPairCandidate}
										class="h-8 bg-background font-mono text-xs {!candidateValid ? 'border-destructive focus-visible:ring-destructive' : ''}"
										oninput={clearPairError}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addUrlPair();
											}
										}}
									/>
								</TableCell>
								<TableCell class="py-2">
									<Button
										variant="ghost"
										size="icon"
										type="button"
										class="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
										onclick={addUrlPair}
										disabled={!canAddPair}
									>
										<PlusIcon class="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
				{#if pairError}
					<div class="mt-3 flex items-center gap-2 text-sm text-destructive">
						<AlertCircleIcon class="h-4 w-4 shrink-0" />
						{pairError}
					</div>
				{/if}
				<div class="mt-3 text-xs text-muted-foreground">
					{urlPairs.length} URL pair{urlPairs.length === 1 ? '' : 's'} configured
				</div>
			</CardContent>
		</Card>
		
		<Card>
			<CardHeader>
				<CardTitle>Viewports</CardTitle>
				<CardDescription>
					Define the screen sizes used for all visual regression tests. These viewports apply
					globally to every project.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="rounded-md border overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead class="w-[70px]">Icon</TableHead>
								<TableHead>Label</TableHead>
								<TableHead class="w-[90px]">Width</TableHead>
								<TableHead class="w-[90px]">Height</TableHead>
								<TableHead class="w-[70px]">Ratio</TableHead>
								<TableHead class="w-[40px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each viewports as viewport, i}
								{@const Icon = getIconComponent(viewport.icon)}
								<TableRow>
									<TableCell class="py-2">
										<div
											class="w-10 h-8 flex items-center justify-center rounded-md border bg-muted/30"
										>
											<Icon class="h-4 w-4 text-muted-foreground" />
										</div>
									</TableCell>
									<TableCell class="font-medium py-2">{viewport.label}</TableCell>
									<TableCell class="py-2">
										<Badge variant="outline" class="font-mono text-xs">
											{viewport.width}
										</Badge>
									</TableCell>
									<TableCell class="py-2">
										<Badge variant="outline" class="font-mono text-xs">
											{viewport.height}
										</Badge>
									</TableCell>
									<TableCell class="py-2">
										<span class="text-xs text-muted-foreground font-mono">
											{computeAspectRatio(viewport.width, viewport.height)}
										</span>
									</TableCell>
									<TableCell class="py-2">
										<Button
											variant="ghost"
											size="icon"
											type="button"
											class="h-6 w-6 text-muted-foreground hover:text-destructive cursor-pointer"
											onclick={() => removeViewport(i)}
											disabled={viewports.length <= 1}
										>
											<XIcon class="h-3 w-3" />
										</Button>
									</TableCell>
								</TableRow>
							{/each}

							<!-- Add new viewport row -->
							<TableRow class="bg-muted/20">
								<TableCell class="py-2">
									<Select.Root
										type="single"
										value={newIcon}
										onValueChange={(v) => (newIcon = v as ViewportIcon)}
									>
										<Select.Trigger class="w-auto h-8 px-2">
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
								<TableCell class="py-2">
									<Input
										placeholder="e.g. tablet"
										bind:value={newLabel}
										class="h-8 bg-background"
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addViewport();
											}
										}}
									/>
								</TableCell>
								<TableCell class="py-2">
									<Input
										type="number"
										bind:value={newWidth}
										min="100"
										class="h-8 bg-background font-mono text-xs w-20"
									/>
								</TableCell>
								<TableCell class="py-2">
									<Input
										type="number"
										bind:value={newHeight}
										min="100"
										class="h-8 bg-background font-mono text-xs w-20"
									/>
								</TableCell>
								<TableCell class="py-2">
									<span class="text-xs font-mono text-muted-foreground">
										{currentAspectRatio}
									</span>
								</TableCell>
								<TableCell class="py-2">
									<Button
										variant="ghost"
										size="icon"
										type="button"
										class="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
										onclick={addViewport}
										disabled={!newLabel.trim() || newWidth < 100 || newHeight < 100}
									>
										<PlusIcon class="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>
				<div class="mt-4 text-xs text-muted-foreground">
					{viewports.length} viewport{viewports.length === 1 ? '' : 's'} configured
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Performance & Timeouts</CardTitle>
				<CardDescription>
					Configure concurrency and timeouts to manage system load. Lower concurrency if you experience network errors.
				</CardDescription>
			</CardHeader>
			<CardContent class="grid gap-6 md:grid-cols-2">
				<div class="space-y-2">
					<label for="asyncCaptureLimit" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						Capture Concurrency
					</label>
					<Input 
						id="asyncCaptureLimit" 
						name="asyncCaptureLimit" 
						type="number" 
						min="1" 
						max="10" 
						bind:value={asyncCaptureLimit} 
					/>
					<p class="text-xs text-muted-foreground">
						Number of browser tabs opening simultaneously to capture screenshots.
					</p>
				</div>
				<div class="space-y-2">
					<label for="asyncCompareLimit" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						Compare Concurrency
					</label>
					<Input 
						id="asyncCompareLimit" 
						name="asyncCompareLimit" 
						type="number" 
						min="1" 
						max="100" 
						bind:value={asyncCompareLimit} 
					/>
					<p class="text-xs text-muted-foreground">
						Number of image pairs compared simultaneously.
					</p>
				</div>
				<div class="space-y-2">
					<label for="waitTimeout" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						Wait Timeout (ms)
					</label>
					<Input 
						id="waitTimeout" 
						name="waitTimeout" 
						type="number" 
						min="1000" 
						step="1000"
						bind:value={waitTimeout} 
					/>
					<p class="text-xs text-muted-foreground">
						Max time to wait for selectors/elements to appear.
					</p>
				</div>
				<div class="space-y-2">
					<label for="gotoTimeout" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
						Navigation Timeout (ms)
					</label>
					<Input 
						id="gotoTimeout" 
						name="gotoTimeout" 
						type="number" 
						min="1000" 
						step="1000"
						bind:value={gotoTimeout} 
					/>
					<p class="text-xs text-muted-foreground">
						Max time to wait for pages to load.
					</p>
				</div>
			</CardContent>
		</Card>

		{#if form?.success === false}
			<div class="text-sm text-destructive bg-destructive/10 p-3 rounded">
				Error: {form.error}
			</div>
		{/if}
		{#if form?.success === true}
			<div class="text-sm text-green-600 bg-green-500/10 p-3 rounded">
				Settings saved successfully.
			</div>
		{/if}

		<div class="flex justify-end">
			<Button type="submit">Save Settings</Button>
		</div>
	</form>
</div>
