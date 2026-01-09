declare module 'backstopjs' {
	export default function backstop(
		command: 'reference' | 'test' | 'approve' | 'openReport',
		options?: { config?: unknown; filter?: string }
	): Promise<void>;
}
