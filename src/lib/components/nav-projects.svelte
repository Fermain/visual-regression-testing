<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import FolderIcon from '@lucide/svelte/icons/folder';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import type { Project } from '$lib/types';

	let { projects }: { projects: Project[] } = $props();

	const sidebar = useSidebar();
</script>

<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
	<Sidebar.GroupLabel>Projects</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each projects as project (project.id)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton isActive={$page.url.pathname === `/project/${project.id}`}>
					{#snippet child({ props })}
						<a href="/project/{project.id}" {...props}>
							<FolderIcon />
							<span>{project.name}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuAction showOnHover {...props}>
								<EllipsisIcon />
								<span class="sr-only">More</span>
							</Sidebar.MenuAction>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-48 rounded-lg"
						side={sidebar.isMobile ? 'bottom' : 'right'}
						align={sidebar.isMobile ? 'end' : 'start'}
					>
						<DropdownMenu.Item>
							<a href="/project/{project.id}" class="flex items-center gap-2 w-full">
								<ExternalLinkIcon class="h-4 w-4 text-muted-foreground" />
								<span>Open Project</span>
							</a>
						</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<form method="POST" action="/?/delete" use:enhance class="contents">
							<input type="hidden" name="id" value={project.id} />
							<DropdownMenu.Item
								class="text-destructive focus:text-destructive"
								onclick={(e) => {
									if (!confirm('Delete this project?')) {
										e.preventDefault();
									}
								}}
							>
								<button type="submit" class="flex items-center gap-2 w-full">
									<Trash2Icon class="h-4 w-4" />
									<span>Delete Project</span>
								</button>
							</DropdownMenu.Item>
						</form>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		{/each}
		<Sidebar.MenuItem>
			<Sidebar.MenuButton class="text-sidebar-foreground/70">
				{#snippet child({ props })}
					<a href="/#new-project" {...props}>
						<PlusIcon />
						<span>New Project</span>
					</a>
				{/snippet}
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Group>
