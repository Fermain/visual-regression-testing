import fs from 'node:fs/promises';
import path from 'node:path';
import type { Project } from '$lib/types';

const DATA_DIR = 'data';
const DB_FILE = path.join(DATA_DIR, 'projects.json');
const DB_FILE_TMP = DB_FILE + '.tmp';

async function ensureDataDir() {
	await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getProjects(): Promise<Project[]> {
	await ensureDataDir();
	try {
		const data = await fs.readFile(DB_FILE, 'utf-8');
		const parsed = JSON.parse(data);
		if (!Array.isArray(parsed)) {
			console.error('projects.json is not an array, returning empty');
			return [];
		}
		return parsed;
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code === 'ENOENT') {
			return [];
		}
		if (error instanceof SyntaxError) {
			console.error('projects.json is corrupted, returning empty:', error.message);
			return [];
		}
		throw error;
	}
}

async function atomicWriteProjects(projects: Project[]): Promise<void> {
	await ensureDataDir();
	const json = JSON.stringify(projects, null, 2);
	await fs.writeFile(DB_FILE_TMP, json, 'utf-8');
	await fs.rename(DB_FILE_TMP, DB_FILE);
}

export async function saveProject(project: Project): Promise<void> {
	const projects = await getProjects();
	const index = projects.findIndex((p) => p.id === project.id);
	if (index >= 0) {
		projects[index] = project;
	} else {
		projects.push(project);
	}
	await atomicWriteProjects(projects);
}

export async function deleteProject(id: string): Promise<void> {
	const projects = await getProjects();
	const filtered = projects.filter((p) => p.id !== id);
	await atomicWriteProjects(filtered);
}

export async function getProject(id: string): Promise<Project | undefined> {
	const projects = await getProjects();
	return projects.find((p) => p.id === id);
}
