<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import LayoutGridIcon from '@lucide/svelte/icons/layout-grid';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import TabletIcon from '@lucide/svelte/icons/tablet';
	import LaptopIcon from '@lucide/svelte/icons/laptop';
	import TvIcon from '@lucide/svelte/icons/tv';
	import WatchIcon from '@lucide/svelte/icons/watch';
	import type { ViewportIcon } from '$lib/types';

	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { formatDistanceToNow } from 'date-fns';

	let { data }: { data: PageData } = $props();

	const iconMap: Record<ViewportIcon, typeof MonitorIcon> = {
		monitor: MonitorIcon,
		laptop: LaptopIcon,
		tablet: TabletIcon,
		smartphone: SmartphoneIcon,
		tv: TvIcon,
		watch: WatchIcon
	};

	function getViewportIcon(icon?: ViewportIcon) {
		if (icon && iconMap[icon]) return iconMap[icon];
		return MonitorIcon;
	}
</script>

<div class="flex-1 overflow-auto p-6 space-y-6">
	<!-- Viewport summary -->
	<Card class="bg-muted/20 border-dashed">
		<CardContent class="p-4 flex items-center justify-between">
			<div class="flex items-center gap-4">
				<span class="text-sm text-muted-foreground font-medium">Active Viewports:</span>
				<div class="flex gap-2 flex-wrap">
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
	<Card id="new-project" class="border-dashed shadow-sm bg-muted/30">
		<CardContent class="p-4 flex items-center gap-3">
			<form method="POST" action="?/create" use:enhance class="flex w-full items-center gap-3">
				<Input
					type="text"
					name="name"
					placeholder="New Project Name"
					class="flex-1 bg-background"
					required
				/>
				<Button type="submit" class="shrink-0 cursor-pointer">
					<PlusIcon class="h-4 w-4 mr-2" />
					Create Project
				</Button>
			</form>
		</CardContent>
	</Card>

	<!-- Projects grid -->
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each data.projects as project (project.id)}
			<div
				class="group relative flex flex-col justify-between rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/50"
			>
				<div class="p-5 space-y-3">
					<div class="space-y-1.5">
						<h3
							class="text-lg font-semibold leading-none tracking-tight group-hover:text-primary transition-colors"
						>
							<a href="/project/{project.id}" class="focus:outline-none">
								<span class="absolute inset-0" aria-hidden="true"></span>
								{project.name}
							</a>
						</h3>
						<div class="flex items-center gap-2 text-xs text-muted-foreground">
							<LayoutGridIcon class="h-3 w-3" />
							<span>{project.paths.length} path{project.paths.length === 1 ? '' : 's'}</span>
						</div>
					</div>

					<div class="flex flex-wrap gap-2">
						{#if project.lastRun}
							<Badge variant="secondary" class="font-normal text-xs">
								<CalendarIcon class="mr-1 h-3 w-3 text-muted-foreground" />
								{formatDistanceToNow(new Date(project.lastRun), { addSuffix: true })}
							</Badge>
						{:else}
							<Badge variant="outline" class="text-muted-foreground font-normal border-dashed text-xs"
								>No runs yet</Badge
							>
						{/if}
					</div>
				</div>

				<div class="px-5 py-3 mt-auto flex justify-between items-center border-t bg-muted/5">
					<div class="flex -space-x-1.5 overflow-hidden">
						{#each data.settings.viewports as viewport}
							{@const Icon = getViewportIcon(viewport.icon)}
							<div
								class="inline-flex h-5 w-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm"
								title="{viewport.label} ({viewport.width}×{viewport.height})"
							>
								<Icon class="h-2.5 w-2.5" />
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
								class="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
							>
								<Trash2Icon class="h-3.5 w-3.5" />
							</Button>
						</form>
					</div>
				</div>
			</div>
		{/each}

		{#if data.projects.length === 0}
			<div class="col-span-full py-16 text-center rounded-xl border border-dashed bg-muted/10">
				<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					<LayoutGridIcon class="h-6 w-6 text-muted-foreground" />
				</div>
				<h3 class="mt-4 text-lg font-semibold">No projects yet</h3>
				<p class="mb-4 text-sm text-muted-foreground">
					Create your first visual regression testing project above.
				</p>
			</div>
		{/if}
	</div>
</div>
