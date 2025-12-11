<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

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

	let { form }: { form: ActionData } = $props();

	let name = $state('');
	let canonicalBaseUrl = $state('');
	let candidateBaseUrl = $state('');
	let paths = $state('/');
	let clickSelector = $state('');
	let postInteractionWait = $state(500);
</script>

<div class="flex-1 overflow-auto p-6">
	<form method="POST" use:enhance class="space-y-6">
		<div class="space-y-2">
			<Label for="name" class="text-xs uppercase tracking-wide text-muted-foreground">Project Name</Label>
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
				<CardTitle class="text-base">URLs</CardTitle>
				<CardDescription>
					Configure the canonical (reference) and candidate (test) base URLs.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="space-y-2">
					<Label for="canonicalBaseUrl">Canonical URL (A)</Label>
					<Input
						type="url"
						id="canonicalBaseUrl"
						name="canonicalBaseUrl"
						bind:value={canonicalBaseUrl}
						placeholder="https://production.example.com"
						class="font-mono text-sm"
					/>
					<p class="text-xs text-muted-foreground">
						The stable reference version (e.g., production)
					</p>
				</div>

				<Separator />

				<div class="space-y-2">
					<Label for="candidateBaseUrl">Candidate URL (B)</Label>
					<Input
						type="url"
						id="candidateBaseUrl"
						name="candidateBaseUrl"
						bind:value={candidateBaseUrl}
						placeholder="https://staging.example.com"
						class="font-mono text-sm"
					/>
					<p class="text-xs text-muted-foreground">
						The version to test (e.g., staging or localhost)
					</p>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-base">Test Paths</CardTitle>
				<CardDescription>
					Enter the paths to test, one per line. These are appended to your base URLs.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Textarea
					name="paths"
					bind:value={paths}
					placeholder={'/\n/about\n/contact\n/pricing'}
					rows={6}
					class="font-mono text-sm"
				/>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle class="text-base">Automation</CardTitle>
				<CardDescription>
					Configure automatic interactions before capturing screenshots.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
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
			</CardContent>
		</Card>

		{#if form?.error}
			<div class="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
				{form.error}
			</div>
		{/if}

		<div class="flex justify-end gap-3">
			<Button variant="outline" type="button" href="/">Cancel</Button>
			<Button type="submit" disabled={!name.trim()}>Create Project</Button>
		</div>
	</form>
</div>
