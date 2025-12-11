<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import HelpCircleIcon from '@lucide/svelte/icons/help-circle';
	import { page } from '$app/stores';

	const navItems = [
		{
			title: 'Tests',
			url: '/',
			icon: LayoutDashboardIcon
		},
		{
			title: 'Settings',
			url: '/settings',
			icon: SettingsIcon
		},
		{
			title: 'Help',
			url: '/help',
			icon: HelpCircleIcon
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
