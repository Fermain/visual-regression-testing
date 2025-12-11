<script lang="ts">
	import './layout.css';
	import type { LayoutData } from './$types';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Separator } from '$lib/components/ui/separator';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { page } from '$app/stores';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	function getBreadcrumbs(pathname: string) {
		if (pathname === '/') return [{ label: 'Tests', href: '/' }];
		if (pathname === '/settings') return [{ label: 'Settings', href: '/settings' }];
		if (pathname === '/help') return [{ label: 'Help', href: '/help' }];
		if (pathname === '/project/new') {
			return [
				{ label: 'Tests', href: '/' },
				{ label: 'New Project', href: pathname }
			];
		}
		if (pathname.startsWith('/project/')) {
			const parts = pathname.split('/');
			const projectId = parts[2];
			const project = data.projects.find((p) => p.id === projectId);
			const isEdit = parts[3] === 'edit';
			
			if (isEdit) {
				return [
					{ label: 'Tests', href: '/' },
					{ label: project?.name ?? 'Project', href: `/project/${projectId}` },
					{ label: 'Edit', href: pathname }
				];
			}
			return [
				{ label: 'Tests', href: '/' },
				{ label: project?.name ?? 'Project', href: pathname }
			];
		}
		return [{ label: 'Tests', href: '/' }];
	}

	let breadcrumbs = $derived(getBreadcrumbs($page.url.pathname));
</script>

<Sidebar.Provider>
	<AppSidebar projects={data.projects} />
	<Sidebar.Inset>
		<header
			class="flex h-12 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-2">
				<Sidebar.Trigger class="-ml-1" />
				<Separator orientation="vertical" class="mr-2 h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						{#each breadcrumbs as crumb, i}
							{#if i > 0}
								<Breadcrumb.Separator />
							{/if}
							<Breadcrumb.Item>
								{#if i === breadcrumbs.length - 1}
									<Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
								{:else}
									<Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
								{/if}
							</Breadcrumb.Item>
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
		</header>
		<div class="flex flex-1 flex-col overflow-hidden">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
