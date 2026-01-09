import fs from 'node:fs/promises';
import path from 'node:path';
import type { Settings } from '$lib/types';
import { DEFAULT_SETTINGS } from '$lib/types';

const DATA_DIR = 'data';
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

async function ensureDataDir() {
	await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getSettings(): Promise<Settings> {
	await ensureDataDir();
	try {
		const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
		const settings = JSON.parse(data);
		// Merge with defaults to ensure all fields are present for existing settings files
		return { ...DEFAULT_SETTINGS, ...settings };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			// Return defaults if file doesn't exist
			return DEFAULT_SETTINGS;
		}
		throw error;
	}
}

export async function saveSettings(settings: Settings): Promise<void> {
	await ensureDataDir();
	await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}


