<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import {
		Plus,
		Trash2,
		Calendar,
		LayoutGrid,
		Monitor,
		Smartphone,
		Tablet,
		Settings,
		Laptop,
		Tv,
		Watch
	} from 'lucide-svelte';
	import type { ViewportIcon } from '$lib/types';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription,
		CardFooter
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { formatDistanceToNow } from 'date-fns';

	export let data: PageData;

	const iconMap: Record<ViewportIcon, typeof Monitor> = {
		monitor: Monitor,
		laptop: Laptop,
		tablet: Tablet,
		smartphone: Smartphone,
		tv: Tv,
		watch: Watch
	};

	function getViewportIcon(icon?: ViewportIcon) {
		if (icon && iconMap[icon]) return iconMap[icon];
		return Monitor;
	}
</script>

<div class="container mx-auto max-w-5xl p-8 space-y-8">
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
		<div class="space-y-1">
			<h1 class="text-3xl font-bold tracking-tight text-gray-900">Visual Regression Tests</h1>
			<p class="text-muted-foreground">Manage and run your visual regression suites.</p>
		</div>

		<div class="flex items-center gap-3">
			<a href="/settings">
				<Button variant="outline" class="cursor-pointer">
					<Settings class="h-4 w-4 mr-2" />
					Settings
				</Button>
			</a>
		</div>
	</div>

	<!-- Viewport summary -->
	<Card class="bg-muted/20 border-dashed">
		<CardContent class="p-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<span class="text-sm text-muted-foreground font-medium">Active Viewports:</span>
				<div class="flex gap-2">
					{#each data.settings.viewports as viewport}
						{@const Icon = getViewportIcon(viewport.icon)}
						<Badge variant="secondary" class="font-normal">
							<Icon class="h-3 w-3 mr-1" />
							{viewport.label}
							<span class="text-muted-foreground ml-1 font-mono text-xs">
								{viewport.width}×{viewport.height}
							</span>
						</Badge>
					{/each}
				</div>
			</div>
			<a href="/settings" class="text-xs text-muted-foreground hover:text-foreground">Edit</a>
		</CardContent>
	</Card>

	<!-- Create new project -->
	<Card class="border-dashed shadow-sm bg-muted/30">
		<CardContent class="p-4 flex items-center gap-3">
			<form method="POST" action="?/create" use:enhance class="flex w-full items-center gap-3">
				<Input
					type="text"
					name="name"
					placeholder="New Project Name"
					class="flex-1 bg-white"
					required
				/>
				<Button type="submit" class="shrink-0 cursor-pointer">
					<Plus class="h-4 w-4 mr-2" />
					Create Project
				</Button>
			</form>
		</CardContent>
	</Card>

	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.projects as project (project.id)}
			<div
				class="group relative flex flex-col justify-between rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-indigo-200"
			>
				<div class="p-6 space-y-4">
					<div class="space-y-2">
						<h3
							class="text-xl font-semibold leading-none tracking-tight group-hover:text-indigo-600 transition-colors"
						>
							<a href="/project/{project.id}" class="focus:outline-none">
								<span class="absolute inset-0" aria-hidden="true"></span>
								{project.name}
							</a>
						</h3>
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<LayoutGrid class="h-3 w-3" />
							<span>{project.paths.length} paths</span>
						</div>
					</div>

					<div class="flex flex-wrap gap-2">
						{#if project.lastRun}
							<Badge variant="secondary" class="font-normal">
								<Calendar class="mr-1 h-3 w-3 text-muted-foreground" />
								{formatDistanceToNow(new Date(project.lastRun), { addSuffix: true })}
							</Badge>
						{:else}
							<Badge variant="outline" class="text-muted-foreground font-normal border-dashed"
								>No runs yet</Badge
							>
						{/if}
					</div>
				</div>

				<div class="p-6 pt-0 mt-auto flex justify-between items-center border-t bg-muted/10">
					<div class="flex -space-x-2 overflow-hidden py-3">
						{#each data.settings.viewports as viewport}
							{@const Icon = getViewportIcon(viewport.icon)}
							<div
								class="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-white text-gray-500 shadow-sm"
								title="{viewport.label} ({viewport.width}×{viewport.height})"
							>
								<Icon class="h-3 w-3" />
							</div>
						{/each}
					</div>

					<div class="relative z-10">
						<form
							method="POST"
							action="?/delete"
							use:enhance
							onsubmit={(e) => {
								if (!confirm('Are you sure you want to delete this project?')) e.preventDefault();
							}}
						>
							<input type="hidden" name="id" value={project.id} />
							<Button
								type="submit"
								variant="ghost"
								size="icon"
								class="h-8 w-8 text-muted-foreground hover:text-red-600 cursor-pointer"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</form>
					</div>
				</div>
			</div>
		{/each}

		{#if data.projects.length === 0}
			<div class="col-span-full py-16 text-center rounded-xl border border-dashed bg-muted/10">
				<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					<LayoutGrid class="h-6 w-6 text-muted-foreground" />
				</div>
				<h3 class="mt-4 text-lg font-semibold">No projects found</h3>
				<p class="mb-4 text-sm text-muted-foreground">
					Get started by creating your first regression testing project above.
				</p>
			</div>
		{/if}
	</div>
</div>
