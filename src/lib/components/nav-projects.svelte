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
	import ConfirmDialog from '$lib/components/confirm-dialog.svelte';

	let { projects }: { projects: Project[] } = $props();

	const sidebar = useSidebar();

	let deleteDialogOpen = $state(false);
	let projectToDelete = $state<Project | null>(null);
	let deleteFormEl = $state<HTMLFormElement | null>(null);

	function openDeleteDialog(project: Project) {
		projectToDelete = project;
		deleteDialogOpen = true;
	}

	function handleDeleteConfirm() {
		if (deleteFormEl && projectToDelete) {
			const input = deleteFormEl.querySelector('input[name="id"]') as HTMLInputElement;
			if (input) {
				input.value = projectToDelete.id;
				deleteFormEl.requestSubmit();
			}
		}
		projectToDelete = null;
	}
</script>

<ConfirmDialog
	bind:open={deleteDialogOpen}
	title="Delete Project"
	description="Are you sure you want to delete '{projectToDelete?.name ?? 'this project'}'? This will permanently remove all test data, references, and reports.

This action cannot be undone."
	confirmText="Delete Project"
	variant="destructive"
	onConfirm={handleDeleteConfirm}
/>

<!-- Hidden form for delete submission -->
<form method="POST" action="/?/delete" use:enhance bind:this={deleteFormEl} class="hidden">
	<input type="hidden" name="id" value="" />
</form>

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
						<DropdownMenu.Item
							class="text-destructive focus:text-destructive"
							onclick={() => openDeleteDialog(project)}
						>
							<Trash2Icon class="h-4 w-4" />
							<span>Delete Project</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		{/each}
		<Sidebar.MenuItem>
			<Sidebar.MenuButton class="text-sidebar-foreground/70">
				{#snippet child({ props })}
					<a href="/project/new" {...props}>
						<PlusIcon />
						<span>New Project</span>
					</a>
				{/snippet}
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Group>
