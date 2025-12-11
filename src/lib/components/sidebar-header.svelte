<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<Sidebar.MenuButton size="lg" class="hover:bg-transparent active:bg-transparent">
			{#snippet child({ props })}
				<a href="/" {...props}>
					<div class="flex items-center gap-2">
						<img
							src="https://cdn.aws.yoti.com/pma/2025/07/22115444/yoti-logo.png"
							alt="Yoti"
							width="70"
							height="32"
						/>
					</div>
					<div class="grid flex-1 text-start text-sm leading-tight">
						<span class="truncate font-semibold">Visual Regression</span>
						<span class="truncate text-xs text-muted-foreground">Testing Tool</span>
					</div>
				</a>
			{/snippet}
		</Sidebar.MenuButton>
	</Sidebar.MenuItem>
</Sidebar.Menu>

