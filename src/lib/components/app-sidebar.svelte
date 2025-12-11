<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavProjects from './nav-projects.svelte';
	import SidebarHeader from './sidebar-header.svelte';
	import ThemeToggle from './theme-toggle.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import type { ComponentProps } from 'svelte';
	import type { Project } from '$lib/types';

	let {
		ref = $bindable(null),
		projects,
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & { projects: Project[] } = $props();
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<SidebarHeader />
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain />
		<NavProjects {projects} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<ThemeToggle />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
