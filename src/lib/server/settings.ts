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
		return JSON.parse(data);
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
