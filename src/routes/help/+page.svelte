<script lang="ts">
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import PlayIcon from '@lucide/svelte/icons/play';
	import FileCheckIcon from '@lucide/svelte/icons/file-check';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
</script>

<div class="flex-1 overflow-auto p-6">
	<div class="space-y-2 mb-8">
		<h1 class="text-3xl font-bold">Visual Regression Testing</h1>
		<p class="text-muted-foreground text-lg">
			A tool for detecting unintended visual changes in web pages by comparing screenshots over time.
		</p>
	</div>

	<div class="space-y-6">
		<Card>
			<CardHeader>
				<CardTitle>What is Visual Regression Testing?</CardTitle>
			</CardHeader>
			<CardContent class="prose">
				<p class="mb-3">
					Visual regression testing automatically detects unintended changes to your web pages by comparing screenshots. 
					This helps catch CSS bugs, layout shifts, and other visual issues before they reach production.
				</p>
				<p>
					This tool wraps <strong>BackstopJS</strong>, providing a user-friendly interface for managing multiple projects 
					and running visual regression tests across different viewports.
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Getting Started</CardTitle>
				<CardDescription>Follow these steps to set up your first visual regression test</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex gap-4">
					<div class="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
						<FolderPlusIcon class="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<h4 class="font-semibold">1. Create a Project</h4>
						<p class="text-sm text-muted-foreground">
							Click "New Project" in the sidebar. Give your project a name and configure the canonical 
							(reference) and candidate (test) URLs. These can be the same URL if you're tracking changes over time.
						</p>
					</div>
				</div>

				<Separator />

				<div class="flex gap-4">
					<div class="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
						<EyeIcon class="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<h4 class="font-semibold">2. Create a Reference</h4>
						<p class="text-sm text-muted-foreground">
							Click "Create New Reference" to capture baseline screenshots from your canonical URL. 
							These screenshots become the "expected" state that future tests are compared against.
						</p>
					</div>
				</div>

				<Separator />

				<div class="flex gap-4">
					<div class="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
						<PlayIcon class="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<h4 class="font-semibold">3. Run Tests</h4>
						<p class="text-sm text-muted-foreground">
							Click "Run Test" to capture new screenshots from your candidate URL and compare them 
							against the reference. The report will highlight any visual differences.
						</p>
					</div>
				</div>

				<Separator />

				<div class="flex gap-4">
					<div class="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
						<FileCheckIcon class="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<h4 class="font-semibold">4. Review & Approve</h4>
						<p class="text-sm text-muted-foreground">
							Review the visual differences in the report. If all changes are intentional, 
							click "Approve All Changes" to update the baseline reference with the new screenshots.
						</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Automation Settings</CardTitle>
				<CardDescription>Handle cookie banners and dynamic content</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<div>
					<h4 class="font-semibold">Delay</h4>
					<p class="text-sm text-muted-foreground">
						Time (in milliseconds) to wait after the page loads before any interactions. 
						Useful for pages with animations or lazy-loaded content.
					</p>
				</div>
				<Separator />
				<div>
					<h4 class="font-semibold">Click Selector</h4>
					<p class="text-sm text-muted-foreground">
						A CSS selector for an element to click before capturing screenshots. 
						Commonly used to dismiss cookie consent banners (e.g., <code class="text-xs bg-muted px-1 py-0.5 rounded">#onetrust-accept-btn-handler</code>).
					</p>
				</div>
				<Separator />
				<div>
					<h4 class="font-semibold">Post-Interaction Wait</h4>
					<p class="text-sm text-muted-foreground">
						Time (in milliseconds) to wait after clicking the selector before capturing screenshots. 
						Allows animations to complete after dismissing popups.
					</p>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Global Settings</CardTitle>
				<CardDescription>Configure viewports and other global options</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="flex gap-4">
					<div class="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
						<SettingsIcon class="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<h4 class="font-semibold">Viewports</h4>
						<p class="text-sm text-muted-foreground">
							Define the screen sizes used for testing. By default, tests run on desktop (1440×900) 
							and mobile (390×844) viewports. You can add, remove, or modify viewports in the Settings page.
						</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<div class="flex items-center gap-2">
					<AlertTriangleIcon class="h-5 w-5" />
					<CardTitle>Test Flakiness</CardTitle>
				</div>
				<CardDescription>Understanding why tests may fail unexpectedly</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4 text-sm text-muted-foreground">
				<p>
					Visual regression tests can sometimes produce "flaky" results - tests that fail even when 
					nothing has actually changed. This is usually caused by dynamic content that renders 
					differently between test runs.
				</p>
				<p>
					<strong class="text-foreground">Common causes of flakiness:</strong>
				</p>
				<ul class="space-y-2 ml-4">
					<li class="flex gap-2">
						<span class="text-muted-foreground">•</span>
						<span><strong class="text-foreground">Carousels and sliders</strong> - may be at different positions in their animation cycle</span>
					</li>
					<li class="flex gap-2">
						<span class="text-muted-foreground">•</span>
						<span><strong class="text-foreground">Auto-playing videos</strong> - different frames captured each time</span>
					</li>
					<li class="flex gap-2">
						<span class="text-muted-foreground">•</span>
						<span><strong class="text-foreground">Timestamps and dates</strong> - "5 minutes ago" becomes "6 minutes ago"</span>
					</li>
					<li class="flex gap-2">
						<span class="text-muted-foreground">•</span>
						<span><strong class="text-foreground">Randomized content</strong> - A/B tests, personalized recommendations</span>
					</li>
					<li class="flex gap-2">
						<span class="text-muted-foreground">•</span>
						<span><strong class="text-foreground">Font rendering</strong> - subtle differences in anti-aliasing</span>
					</li>
				</ul>
				<p>
					To confirm flakiness, try running a test where both the canonical and candidate URLs point 
					to the same domain. If you see differences, they're likely caused by dynamic content rather 
					than actual changes.
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader>
				<CardTitle>Tips</CardTitle>
			</CardHeader>
			<CardContent>
				<ul class="space-y-3 text-sm">
					<li class="flex gap-2">
						<span class="text-muted-foreground shrink-0">•</span>
						<span class="text-muted-foreground"><strong class="text-foreground">Use the same URLs</strong> for canonical and candidate when tracking changes over time on a single environment.</span>
					</li>
					<li class="flex gap-2">
						<span class="text-muted-foreground shrink-0">•</span>
						<span class="text-muted-foreground"><strong class="text-foreground">Different URLs</strong> are useful for comparing staging vs. production, or before/after a deployment.</span>
					</li>
					<li class="flex gap-2">
						<span class="text-muted-foreground shrink-0">•</span>
						<span class="text-muted-foreground"><strong class="text-foreground">Cookie banners</strong> should be dismissed using the Click Selector setting to get consistent screenshots.</span>
					</li>
					<li class="flex gap-2">
						<span class="text-muted-foreground shrink-0">•</span>
						<span class="text-muted-foreground"><strong class="text-foreground">Increase the delay</strong> if you're seeing inconsistent results due to slow-loading content.</span>
					</li>
					<li class="flex gap-2">
						<span class="text-muted-foreground shrink-0">•</span>
						<span class="text-muted-foreground"><strong class="text-foreground">Review carefully</strong> before approving changes - once approved, those screenshots become the new baseline.</span>
					</li>
				</ul>
			</CardContent>
		</Card>
	</div>
</div>
