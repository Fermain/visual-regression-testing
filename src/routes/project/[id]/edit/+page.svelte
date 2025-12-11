<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

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

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state(data.project.name);
	let canonicalBaseUrl = $state(data.project.canonicalBaseUrl);
	let candidateBaseUrl = $state(data.project.candidateBaseUrl);
	let paths = $state(data.project.paths.join('\n'));
</script>

<div class="flex-1 overflow-auto p-6">
	<form method="POST" action="?/update" use:enhance class="space-y-6">
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
				<CardDescription>Enter the paths to test, one per line.</CardDescription>
			</CardHeader>
			<CardContent>
				<Textarea
					name="paths"
					bind:value={paths}
					placeholder={'/\n/about\n/contact'}
					rows={6}
					class="font-mono text-sm"
				/>
			</CardContent>
		</Card>

		{#if form?.error}
			<div class="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
				{form.error}
			</div>
		{/if}

		<div class="flex justify-end gap-3">
			<Button variant="outline" type="button" href="/project/{data.project.id}">Cancel</Button>
			<Button type="submit" disabled={!name.trim()}>Save Changes</Button>
		</div>
	</form>

	<Separator class="my-8" />

	<Card class="border-destructive/30">
		<CardHeader>
			<CardTitle class="text-base text-destructive">Danger Zone</CardTitle>
			<CardDescription>Permanently delete this project and all its test data.</CardDescription>
		</CardHeader>
		<CardContent>
			<form method="POST" action="?/delete" use:enhance>
				<Button
					variant="destructive"
					type="submit"
					onclick={(e) => {
						if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
							e.preventDefault();
						}
					}}
				>
					<Trash2Icon class="h-4 w-4 mr-2" />
					Delete Project
				</Button>
			</form>
		</CardContent>
	</Card>
</div>
