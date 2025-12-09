import fs from 'node:fs/promises';
import path from 'node:path';
import type { Project } from '$lib/types';

const DATA_DIR = 'data';
const DB_FILE = path.join(DATA_DIR, 'projects.json');

async function ensureDataDir() {
	await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getProjects(): Promise<Project[]> {
	await ensureDataDir();
	try {
		const data = await fs.readFile(DB_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return [];
		}
		throw error;
	}
}

export async function saveProject(project: Project): Promise<void> {
	const projects = await getProjects();
	const index = projects.findIndex((p) => p.id === project.id);
	if (index >= 0) {
		projects[index] = project;
	} else {
		projects.push(project);
	}
	await fs.writeFile(DB_FILE, JSON.stringify(projects, null, 2));
}

export async function deleteProject(id: string): Promise<void> {
	const projects = await getProjects();
	const filtered = projects.filter((p) => p.id !== id);
	await fs.writeFile(DB_FILE, JSON.stringify(filtered, null, 2));
}

export async function getProject(id: string): Promise<Project | undefined> {
	const projects = await getProjects();
	return projects.find((p) => p.id === id);
}
