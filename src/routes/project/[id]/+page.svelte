<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	export let data: PageData;
	export let form: ActionData;

	let isRunning = false;
	$: project = data.project;

	// Check if report exists by checking if we have any test runs in our custom report logic
	// A better way might be to check if the file exists on server, but for now we rely on the report object presence
	// or we can optimistically link to it.

	$: reportUrl = project ? `/report/${project.id}/html_report/index.html` : '';
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<a href="/" class="text-indigo-600 hover:text-indigo-800 mb-2 inline-block"
				>&larr; Back to Dashboard</a
			>
			<h1 class="text-3xl font-bold text-gray-900">{project.name}</h1>
		</div>
		<div class="text-sm text-gray-500">
			ID: {project.id}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Configuration Column -->
		<div class="lg:col-span-1 space-y-6">
			<div class="rounded-lg bg-white p-6 shadow ring-1 ring-gray-200">
				<h2 class="mb-4 text-xl font-semibold text-gray-800">Configuration</h2>
				<form method="POST" action="?/update" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700" for="name">Project Name</label>
						<input
							type="text"
							id="name"
							name="name"
							value={project.name}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							required
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700" for="canonicalBaseUrl"
							>Canonical URL (Reference)</label
						>
						<input
							type="url"
							id="canonicalBaseUrl"
							name="canonicalBaseUrl"
							value={project.canonicalBaseUrl}
							placeholder="https://production.com"
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							required
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700" for="candidateBaseUrl"
							>Candidate URL (Test)</label
						>
						<input
							type="url"
							id="candidateBaseUrl"
							name="candidateBaseUrl"
							value={project.candidateBaseUrl}
							placeholder="https://staging.com"
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
							required
						/>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700" for="paths"
							>Paths (one per line)</label
						>
						<textarea
							id="paths"
							name="paths"
							rows="6"
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
							placeholder="/">{project.paths.join('\n')}</textarea
						>
						<p class="mt-1 text-xs text-gray-500">Enter paths relative to the base URLs.</p>
					</div>

					<div class="pt-2">
						<button
							type="submit"
							class="w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
						>
							Save Configuration
						</button>
					</div>
				</form>
			</div>

			<div class="rounded-lg bg-white p-6 shadow ring-1 ring-gray-200">
				<h2 class="mb-4 text-xl font-semibold text-gray-800">Actions</h2>
				<form
					method="POST"
					action="?/run"
					use:enhance={() => {
						isRunning = true;
						return async ({ update }) => {
							await update();
							isRunning = false;
						};
					}}
					class="flex flex-col gap-3"
				>
					<button
						type="submit"
						name="command"
						value="reference"
						disabled={isRunning}
						class="w-full rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
					>
						1. Create Reference (Canonical)
					</button>

					<button
						type="submit"
						name="command"
						value="test"
						disabled={isRunning}
						class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
					>
						2. Run Test (Compare)
					</button>

					<button
						type="submit"
						name="command"
						value="approve"
						disabled={isRunning}
						class="w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
					>
						3. Approve Changes
					</button>
				</form>
				{#if isRunning}
					<div class="mt-4 text-center text-sm text-gray-600 animate-pulse">
						Running BackstopJS... please wait.
					</div>
				{/if}
				{#if form?.success === false}
					<div class="mt-4 p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
						Error: {form.error || 'Operation failed'}
					</div>
				{/if}
				{#if form?.success === true}
					<div class="mt-4 p-3 rounded bg-green-50 text-green-700 text-sm border border-green-200">
						Command '{form.command}' completed successfully.
					</div>
				{/if}
			</div>
		</div>

		<!-- Results Column -->
		<div class="lg:col-span-2 flex flex-col h-[calc(100vh-8rem)]">
			<div
				class="bg-white rounded-lg shadow ring-1 ring-gray-200 flex-1 overflow-hidden flex flex-col"
			>
				<div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
					<h2 class="text-lg font-semibold text-gray-800">BackstopJS Report</h2>
					<a href={reportUrl} target="_blank" class="text-sm text-indigo-600 hover:text-indigo-800"
						>Open in new tab &nearr;</a
					>
				</div>
				{#if project.lastRun}
					<iframe src={reportUrl} title="BackstopJS Report" class="w-full h-full border-0"></iframe>
				{:else}
					<div class="flex-1 flex items-center justify-center text-gray-400">
						<p>No report available. Run a test to generate one.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
