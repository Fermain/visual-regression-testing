<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	export let data: PageData;
</script>

<div class="container mx-auto max-w-4xl p-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-800">Visual Regression Tests</h1>
	</div>

	<div class="mb-8 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
		<h2 class="mb-4 text-xl font-semibold text-gray-700">Create New Project</h2>
		<form method="POST" action="?/create" use:enhance class="flex gap-4">
			<input
				type="text"
				name="name"
				placeholder="Project Name (e.g. Marketing Site)"
				class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
				required
			/>
			<button
				type="submit"
				class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
			>
				Create Project
			</button>
		</form>
	</div>

	<div class="grid gap-6 sm:grid-cols-2">
		{#each data.projects as project (project.id)}
			<div
				class="relative flex flex-col justify-between rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md"
			>
				<div>
					<h3 class="text-xl font-semibold text-gray-900">
						<a
							href="/project/{project.id}"
							class="hover:underline hover:text-indigo-600 focus:outline-none"
						>
							<span class="absolute inset-0" aria-hidden="true"></span>
							{project.name}
						</a>
					</h3>
					<p class="mt-2 text-sm text-gray-500">
						{#if project.lastRun}
							Last run: {new Date(project.lastRun).toLocaleString()}
						{:else}
							No runs yet
						{/if}
					</p>
					<p class="mt-1 text-sm text-gray-500">
						{project.paths.length} path{project.paths.length === 1 ? '' : 's'} configured
					</p>
				</div>

				<div class="mt-4 flex justify-end relative z-10">
					<form
						method="POST"
						action="?/delete"
						use:enhance
						on:submit|preventDefault={(e) => {
							if (!confirm('Are you sure you want to delete this project?')) e.preventDefault();
						}}
					>
						<input type="hidden" name="id" value={project.id} />
						<button type="submit" class="text-sm text-red-600 hover:text-red-800">Delete</button>
					</form>
				</div>
			</div>
		{/each}
		{#if data.projects.length === 0}
			<div class="col-span-full py-12 text-center text-gray-500">
				No projects found. Create one to get started.
			</div>
		{/if}
	</div>
</div>
