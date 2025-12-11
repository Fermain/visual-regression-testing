<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Button } from '$lib/components/ui/button';

	let {
		open = $bindable(false),
		title,
		description,
		confirmText = 'Continue',
		cancelText = 'Cancel',
		variant = 'default',
		onConfirm
	}: {
		open: boolean;
		title: string;
		description: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'default' | 'destructive';
		onConfirm: () => void;
	} = $props();

	function handleConfirm() {
		onConfirm();
		open = false;
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description class="whitespace-pre-line">
				{description}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{cancelText}</AlertDialog.Cancel>
			<Button variant={variant} onclick={handleConfirm}>
				{confirmText}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

