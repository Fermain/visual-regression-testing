<script lang="ts">
	import { browser } from '$app/environment';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';

	let isDark = $state(true);

	$effect(() => {
		if (browser) {
			isDark = document.documentElement.classList.contains('dark');
		}
	});

	function toggleTheme() {
		if (browser) {
			isDark = !isDark;
			document.documentElement.classList.toggle('dark', isDark);
			localStorage.setItem('theme', isDark ? 'dark' : 'light');
		}
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton tooltipContent={isDark ? 'Light mode' : 'Dark mode'} onclick={toggleTheme}>
			{#if isDark}
				<SunIcon class="h-4 w-4" />
				<span>Light Mode</span>
			{:else}
				<MoonIcon class="h-4 w-4" />
				<span>Dark Mode</span>
			{/if}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>

