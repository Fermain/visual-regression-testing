<script lang="ts">
	import './layout.css';
	import type { LayoutData } from './$types';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import { extractHostname } from '$lib/types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	function getBreadcrumbs(pathname: string) {
		if (pathname === '/') return [{ label: 'Tests', href: '/' }];
		if (pathname === '/settings') return [{ label: 'Settings', href: '/settings' }];
		if (pathname === '/failed') return [{ label: 'Failed', href: '/failed' }];
		if (pathname === '/passing') return [{ label: 'Passing', href: '/passing' }];
		if (pathname === '/queue') return [{ label: 'Queue', href: '/queue' }];
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

	function handlePairChange(pairId: string) {
		const url = new URL($page.url);
		url.searchParams.set('pair', pairId);
		goto(url.toString(), { replaceState: true, keepFocus: true });
	}
</script>

<Sidebar.Provider>
	<AppSidebar projects={data.projects} />
	<Sidebar.Inset>
		<header
			class="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
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

			{#if data.urlPairs.length > 0}
				<Select.Root
					type="single"
					value={data.selectedPair?.id || ''}
					onValueChange={handlePairChange}
				>
					<Select.Trigger class="w-auto min-w-[200px] h-8 text-xs">
						{#if data.selectedPair}
							<span class="flex items-center gap-1.5 font-mono">
								<span class="text-muted-foreground">{extractHostname(data.selectedPair.canonicalUrl)}</span>
								<ArrowRightIcon class="h-3 w-3 text-muted-foreground" />
								<span>{extractHostname(data.selectedPair.candidateUrl)}</span>
							</span>
						{:else}
							<span class="text-muted-foreground">Select environment</span>
						{/if}
					</Select.Trigger>
					<Select.Content>
						{#each data.urlPairs as pair}
							<Select.Item value={pair.id}>
								<span class="flex items-center gap-1.5 font-mono text-xs">
									<span class="text-muted-foreground">{extractHostname(pair.canonicalUrl)}</span>
									<ArrowRightIcon class="h-3 w-3 text-muted-foreground" />
									<span>{extractHostname(pair.candidateUrl)}</span>
								</span>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/if}
		</header>
		<div class="flex flex-1 flex-col overflow-hidden">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
