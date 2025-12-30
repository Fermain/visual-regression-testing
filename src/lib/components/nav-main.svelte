<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import { page } from '$app/stores';

	const navItems = [
		{
			title: 'Tests',
			url: '/',
			icon: LayoutDashboardIcon
		},
		{
			title: 'Failed',
			url: '/failed',
			icon: XCircleIcon
		},
		{
			title: 'Passing',
			url: '/passing',
			icon: CheckCircle2Icon
		},
		{
			title: 'Settings',
			url: '/settings',
			icon: SettingsIcon
		}
	];

	function isActive(url: string, pathname: string): boolean {
		if (url === '/') return pathname === '/';
		return pathname.startsWith(url);
	}
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each navItems as item (item.title)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					tooltipContent={item.title}
					isActive={isActive(item.url, $page.url.pathname)}
				>
					{#snippet child({ props })}
						<a href={item.url} {...props}>
							<item.icon />
							<span>{item.title}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>

<Sidebar.Group>
	<Sidebar.GroupLabel>Actions</Sidebar.GroupLabel>
	<Sidebar.Menu>
		<Sidebar.MenuItem>
			<Sidebar.MenuButton tooltipContent="Export All Reports">
				{#snippet child({ props })}
					<a href="/api/export-all" download {...props}>
						<DownloadIcon />
						<span>Export All</span>
					</a>
				{/snippet}
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	</Sidebar.Menu>
</Sidebar.Group>
