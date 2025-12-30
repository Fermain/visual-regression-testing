<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import PlayCircleIcon from '@lucide/svelte/icons/play-circle';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	const navItems = [
		{
			title: 'Tests',
			url: '/',
			icon: LayoutDashboardIcon
		},
		{
			title: 'Queue',
			url: '/queue',
			icon: ListOrderedIcon
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

	let isRunningAll = $state(false);

	async function handleRunAll() {
		if (isRunningAll) return;
		isRunningAll = true;

		try {
			const res = await fetch('/api/run-all', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ commands: ['reference', 'test'] })
			});
			const data = await res.json();

			if (data.success) {
				// Navigate to queue page to show progress
				goto('/queue');
			} else {
				alert(data.error || 'Failed to queue jobs');
			}
		} catch (e) {
			alert('Error starting run');
		} finally {
			isRunningAll = false;
		}
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
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div 
				class="flex w-full items-center gap-2 rounded-md p-2 text-sm cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
				onclick={handleRunAll}
			>
				{#if isRunningAll}
					<Loader2Icon class="h-4 w-4 animate-spin" />
					<span>Queueing...</span>
				{:else}
					<PlayCircleIcon class="h-4 w-4" />
					<span>Run All</span>
				{/if}
			</div>
		</Sidebar.MenuItem>
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
