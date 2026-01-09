import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import path from 'node:path';
import fs from 'node:fs';
import type { Project, Settings, Viewport, UrlPair } from '$lib/types';
import { DEFAULT_SETTINGS } from '$lib/types';

const DATA_DIR = 'data';
const DB_PATH = path.join(DATA_DIR, 'app.db');

let db: SqlJsDatabase | null = null;
let dbInitPromise: Promise<SqlJsDatabase> | null = null;

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true });
	}
}

async function initDb(): Promise<SqlJsDatabase> {
	if (db) return db;
	if (dbInitPromise) return dbInitPromise;

	dbInitPromise = (async () => {
		ensureDataDir();
		const SQL = await initSqlJs();

		let database: SqlJsDatabase;
		if (fs.existsSync(DB_PATH)) {
			const fileBuffer = fs.readFileSync(DB_PATH);
			database = new SQL.Database(fileBuffer);
		} else {
			database = new SQL.Database();
		}

		initSchema(database);
		migrateFromJson(database);
		saveDbToFile(database);

		db = database;
		return database;
	})();

	return dbInitPromise;
}

function saveDbToFile(database: SqlJsDatabase) {
	const data = database.export();
	const buffer = Buffer.from(data);
	fs.writeFileSync(DB_PATH, buffer);
}

function getDbSync(): SqlJsDatabase {
	if (!db) {
		throw new Error('Database not initialized. Call initDb() first.');
	}
	return db;
}

function initSchema(database: SqlJsDatabase) {
	database.run(`
		CREATE TABLE IF NOT EXISTS projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			paths TEXT NOT NULL,
			delay INTEGER,
			click_selector TEXT,
			post_interaction_wait INTEGER,
			hide_selectors TEXT,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		)
	`);

	database.run(`
		CREATE TABLE IF NOT EXISTS pair_results (
			project_id TEXT NOT NULL,
			pair_id TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'idle',
			last_run TEXT,
			last_result TEXT,
			progress TEXT,
			PRIMARY KEY (project_id, pair_id),
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)
	`);

	database.run(`
		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`);

	database.run(`
		CREATE TABLE IF NOT EXISTS run_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			project_id TEXT NOT NULL,
			pair_id TEXT NOT NULL,
			command TEXT NOT NULL,
			success INTEGER NOT NULL,
			duration_ms INTEGER NOT NULL,
			error TEXT,
			created_at TEXT DEFAULT (datetime('now')),
			FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
		)
	`);

	database.run(`CREATE INDEX IF NOT EXISTS idx_run_history_project ON run_history(project_id)`);
	database.run(
		`CREATE INDEX IF NOT EXISTS idx_run_history_lookup ON run_history(project_id, pair_id, command)`
	);

	database.run(`
		CREATE TABLE IF NOT EXISTS migrations (
			name TEXT PRIMARY KEY,
			applied_at TEXT DEFAULT (datetime('now'))
		)
	`);
}

function migrateFromJson(database: SqlJsDatabase) {
	const result = database.exec("SELECT 1 FROM migrations WHERE name = 'json_import'");
	if (result.length > 0 && result[0].values.length > 0) return;

	console.log('[DB] Checking for JSON files to migrate...');

	const projectsFile = path.join(DATA_DIR, 'projects.json');
	if (fs.existsSync(projectsFile)) {
		try {
			const data = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'));
			if (Array.isArray(data)) {
				for (const project of data) {
					database.run(
						`INSERT OR REPLACE INTO projects (id, name, paths, delay, click_selector, post_interaction_wait, hide_selectors)
						 VALUES (?, ?, ?, ?, ?, ?, ?)`,
						[
							project.id,
							project.name,
							JSON.stringify(project.paths || []),
							project.delay ?? null,
							project.clickSelector ?? null,
							project.postInteractionWait ?? null,
							project.hideSelectors ? JSON.stringify(project.hideSelectors) : null
						]
					);

					if (project.pairResults) {
						for (const [pairId, result] of Object.entries(project.pairResults)) {
							const pr = result as {
								status?: string;
								lastRun?: string;
								lastResult?: unknown;
							};
							database.run(
								`INSERT OR REPLACE INTO pair_results (project_id, pair_id, status, last_run, last_result)
								 VALUES (?, ?, ?, ?, ?)`,
								[
									project.id,
									pairId,
									pr.status || 'idle',
									pr.lastRun ?? null,
									pr.lastResult ? JSON.stringify(pr.lastResult) : null
								]
							);
						}
					}
				}
				console.log(`[DB] Migrated ${data.length} projects from projects.json`);
			}
		} catch (e) {
			console.error('[DB] Failed to migrate projects.json:', e);
		}
	}

	const settingsFile = path.join(DATA_DIR, 'settings.json');
	if (fs.existsSync(settingsFile)) {
		try {
			const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));

			if (settings.viewports) {
				database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
					'viewports',
					JSON.stringify(settings.viewports)
				]);
			}
			if (settings.urlPairs) {
				database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
					'urlPairs',
					JSON.stringify(settings.urlPairs)
				]);
			}
			if (settings.asyncCaptureLimit !== undefined) {
				database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
					'asyncCaptureLimit',
					String(settings.asyncCaptureLimit)
				]);
			}
			if (settings.asyncCompareLimit !== undefined) {
				database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
					'asyncCompareLimit',
					String(settings.asyncCompareLimit)
				]);
			}
			if (settings.waitTimeout !== undefined) {
				database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
					'waitTimeout',
					String(settings.waitTimeout)
				]);
			}
			if (settings.gotoTimeout !== undefined) {
				database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
					'gotoTimeout',
					String(settings.gotoTimeout)
				]);
			}
			console.log('[DB] Migrated settings from settings.json');
		} catch (e) {
			console.error('[DB] Failed to migrate settings.json:', e);
		}
	}

	const historyFile = path.join(DATA_DIR, 'run-history.json');
	if (fs.existsSync(historyFile)) {
		try {
			const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
			let count = 0;
			for (const [projectId, runs] of Object.entries(history.projects || {})) {
				for (const run of runs as Array<{
					pairId: string;
					command: string;
					success: boolean;
					durationMs: number;
					error?: string;
					date: string;
				}>) {
					database.run(
						`INSERT INTO run_history (project_id, pair_id, command, success, duration_ms, error, created_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?)`,
						[
							projectId,
							run.pairId,
							run.command,
							run.success ? 1 : 0,
							run.durationMs,
							run.error ?? null,
							run.date
						]
					);
					count++;
				}
			}
			console.log(`[DB] Migrated ${count} run history records from run-history.json`);
		} catch (e) {
			console.error('[DB] Failed to migrate run-history.json:', e);
		}
	}

	database.run("INSERT INTO migrations (name) VALUES ('json_import')");
	console.log('[DB] Migration complete');
}

// --- Projects ---

export function getProjects(): Project[] {
	const database = getDbSync();
	const result = database.exec('SELECT * FROM projects ORDER BY name');

	if (result.length === 0) return [];

	const columns = result[0].columns;
	const projects: Project[] = [];

	for (const row of result[0].values) {
		const rowObj: Record<string, unknown> = {};
		columns.forEach((col: string, i: number) => {
			rowObj[col] = row[i];
		});

		const project = rowToProject(rowObj);

		const pairResults = database.exec(
			'SELECT * FROM pair_results WHERE project_id = ?',
			[rowObj.id as string]
		);

		if (pairResults.length > 0 && pairResults[0].values.length > 0) {
			const prCols = pairResults[0].columns;
			project.pairResults = {};

			for (const prRow of pairResults[0].values) {
				const prObj: Record<string, unknown> = {};
				prCols.forEach((col: string, i: number) => {
					prObj[col] = prRow[i];
				});

				const pairId = prObj.pair_id as string;
				project.pairResults[pairId] = {
					status: (prObj.status as 'idle' | 'queued' | 'running') || 'idle',
					lastRun: (prObj.last_run as string) ?? undefined,
					lastResult: prObj.last_result
						? JSON.parse(prObj.last_result as string)
						: undefined,
					progress: prObj.progress ? JSON.parse(prObj.progress as string) : undefined
				};
			}
		}

		projects.push(project);
	}

	return projects;
}

export function getProject(id: string): Project | undefined {
	const database = getDbSync();
	const result = database.exec('SELECT * FROM projects WHERE id = ?', [id]);

	if (result.length === 0 || result[0].values.length === 0) return undefined;

	const columns = result[0].columns;
	const row = result[0].values[0];
	const rowObj: Record<string, unknown> = {};
	columns.forEach((col: string, i: number) => {
		rowObj[col] = row[i];
	});

	const project = rowToProject(rowObj);

	const pairResults = database.exec('SELECT * FROM pair_results WHERE project_id = ?', [id]);

	if (pairResults.length > 0 && pairResults[0].values.length > 0) {
		const prCols = pairResults[0].columns;
		project.pairResults = {};

		for (const prRow of pairResults[0].values) {
			const prObj: Record<string, unknown> = {};
			prCols.forEach((col: string, i: number) => {
				prObj[col] = prRow[i];
			});

			const pairId = prObj.pair_id as string;
			project.pairResults[pairId] = {
				status: (prObj.status as 'idle' | 'queued' | 'running') || 'idle',
				lastRun: (prObj.last_run as string) ?? undefined,
				lastResult: prObj.last_result ? JSON.parse(prObj.last_result as string) : undefined,
				progress: prObj.progress ? JSON.parse(prObj.progress as string) : undefined
			};
		}
	}

	return project;
}

function rowToProject(row: Record<string, unknown>): Project {
	const project: Project = {
		id: row.id as string,
		name: row.name as string,
		paths: JSON.parse(row.paths as string)
	};

	if (row.delay !== null) project.delay = row.delay as number;
	if (row.click_selector) project.clickSelector = row.click_selector as string;
	if (row.post_interaction_wait !== null)
		project.postInteractionWait = row.post_interaction_wait as number;
	if (row.hide_selectors) project.hideSelectors = JSON.parse(row.hide_selectors as string);

	return project;
}

export function saveProject(project: Project): void {
	const database = getDbSync();

	database.run(
		`INSERT INTO projects (id, name, paths, delay, click_selector, post_interaction_wait, hide_selectors, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
		 ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			paths = excluded.paths,
			delay = excluded.delay,
			click_selector = excluded.click_selector,
			post_interaction_wait = excluded.post_interaction_wait,
			hide_selectors = excluded.hide_selectors,
			updated_at = datetime('now')`,
		[
			project.id,
			project.name,
			JSON.stringify(project.paths),
			project.delay ?? null,
			project.clickSelector ?? null,
			project.postInteractionWait ?? null,
			project.hideSelectors ? JSON.stringify(project.hideSelectors) : null
		]
	);

	if (project.pairResults) {
		for (const [pairId, result] of Object.entries(project.pairResults)) {
			database.run(
				`INSERT INTO pair_results (project_id, pair_id, status, last_run, last_result, progress)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(project_id, pair_id) DO UPDATE SET
					status = excluded.status,
					last_run = excluded.last_run,
					last_result = excluded.last_result,
					progress = excluded.progress`,
				[
					project.id,
					pairId,
					result.status,
					result.lastRun ?? null,
					result.lastResult ? JSON.stringify(result.lastResult) : null,
					result.progress ? JSON.stringify(result.progress) : null
				]
			);
		}
	}

	saveDbToFile(database);
}

export function updatePairResult(
	projectId: string,
	pairId: string,
	update: Partial<{
		status: 'idle' | 'queued' | 'running';
		lastRun: string;
		lastResult: { success: boolean; command: 'reference' | 'test' | 'approve'; error?: string };
		progress: { total: number; completed: number; current: string } | null;
	}>
): void {
	const database = getDbSync();

	const existing = database.exec(
		'SELECT * FROM pair_results WHERE project_id = ? AND pair_id = ?',
		[projectId, pairId]
	);

	let currentStatus = 'idle';
	let currentLastRun: string | null = null;
	let currentLastResult: string | null = null;
	let currentProgress: string | null = null;

	if (existing.length > 0 && existing[0].values.length > 0) {
		const cols = existing[0].columns;
		const row = existing[0].values[0];
		const rowObj: Record<string, unknown> = {};
		cols.forEach((col: string, i: number) => {
			rowObj[col] = row[i];
		});
		currentStatus = (rowObj.status as string) || 'idle';
		currentLastRun = rowObj.last_run as string | null;
		currentLastResult = rowObj.last_result as string | null;
		currentProgress = rowObj.progress as string | null;
	}

	const status = update.status ?? currentStatus;
	const lastRun = update.lastRun ?? currentLastRun;
	const lastResult =
		update.lastResult !== undefined
			? JSON.stringify(update.lastResult)
			: currentLastResult;
	const progress =
		update.progress !== undefined
			? update.progress
				? JSON.stringify(update.progress)
				: null
			: currentProgress;

	database.run(
		`INSERT INTO pair_results (project_id, pair_id, status, last_run, last_result, progress)
		 VALUES (?, ?, ?, ?, ?, ?)
		 ON CONFLICT(project_id, pair_id) DO UPDATE SET
			status = excluded.status,
			last_run = excluded.last_run,
			last_result = excluded.last_result,
			progress = excluded.progress`,
		[projectId, pairId, status, lastRun, lastResult, progress]
	);

	saveDbToFile(database);
}

export function deleteProject(id: string): void {
	const database = getDbSync();
	database.run('DELETE FROM pair_results WHERE project_id = ?', [id]);
	database.run('DELETE FROM projects WHERE id = ?', [id]);
	saveDbToFile(database);
}

// --- Settings ---

export function getSettings(): Settings {
	const database = getDbSync();
	const result = database.exec('SELECT key, value FROM settings');

	const settings: Settings = { ...DEFAULT_SETTINGS };

	if (result.length > 0) {
		for (const row of result[0].values) {
			const key = row[0] as string;
			const value = row[1] as string;

			switch (key) {
				case 'viewports':
					settings.viewports = JSON.parse(value) as Viewport[];
					break;
				case 'urlPairs':
					settings.urlPairs = JSON.parse(value) as UrlPair[];
					break;
				case 'asyncCaptureLimit':
					settings.asyncCaptureLimit = parseInt(value, 10);
					break;
				case 'asyncCompareLimit':
					settings.asyncCompareLimit = parseInt(value, 10);
					break;
				case 'waitTimeout':
					settings.waitTimeout = parseInt(value, 10);
					break;
				case 'gotoTimeout':
					settings.gotoTimeout = parseInt(value, 10);
					break;
			}
		}
	}

	return settings;
}

export function saveSettings(settings: Settings): void {
	const database = getDbSync();

	database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
		'viewports',
		JSON.stringify(settings.viewports)
	]);
	database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
		'urlPairs',
		JSON.stringify(settings.urlPairs)
	]);
	database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
		'asyncCaptureLimit',
		String(settings.asyncCaptureLimit)
	]);
	database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
		'asyncCompareLimit',
		String(settings.asyncCompareLimit)
	]);
	database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
		'waitTimeout',
		String(settings.waitTimeout)
	]);
	database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
		'gotoTimeout',
		String(settings.gotoTimeout)
	]);

	saveDbToFile(database);
}

// --- Run History ---

export interface RunRecord {
	date: string;
	command: 'reference' | 'test' | 'approve';
	pairId: string;
	success: boolean;
	durationMs: number;
	error?: string;
}

export function addRunRecord(projectId: string, record: Omit<RunRecord, 'date'>): void {
	const database = getDbSync();

	database.run(
		`INSERT INTO run_history (project_id, pair_id, command, success, duration_ms, error)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[
			projectId,
			record.pairId,
			record.command,
			record.success ? 1 : 0,
			record.durationMs,
			record.error ?? null
		]
	);

	database.run(
		`DELETE FROM run_history 
		 WHERE project_id = ? 
		 AND id NOT IN (
			SELECT id FROM run_history WHERE project_id = ? ORDER BY created_at DESC LIMIT 100
		 )`,
		[projectId, projectId]
	);

	saveDbToFile(database);
}

export function getProjectHistory(projectId: string): RunRecord[] {
	const database = getDbSync();
	const result = database.exec(
		`SELECT pair_id, command, success, duration_ms, error, created_at
		 FROM run_history
		 WHERE project_id = ?
		 ORDER BY created_at ASC`,
		[projectId]
	);

	if (result.length === 0) return [];

	return result[0].values.map((row) => ({
		date: row[5] as string,
		command: row[1] as 'reference' | 'test' | 'approve',
		pairId: row[0] as string,
		success: row[2] === 1,
		durationMs: row[3] as number,
		error: (row[4] as string) ?? undefined
	}));
}

export function getProjectStats(projectId: string): {
	totalRuns: number;
	successRate: number;
	avgDurationMs: number;
	lastRun?: RunRecord;
} {
	const database = getDbSync();
	const result = database.exec(
		`SELECT 
			COUNT(*) as total,
			SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
			AVG(duration_ms) as avg_duration
		 FROM run_history
		 WHERE project_id = ?`,
		[projectId]
	);

	if (result.length === 0 || result[0].values[0][0] === 0) {
		return { totalRuns: 0, successRate: 0, avgDurationMs: 0 };
	}

	const total = result[0].values[0][0] as number;
	const successful = result[0].values[0][1] as number;
	const avgDuration = result[0].values[0][2] as number | null;

	const lastResult = database.exec(
		`SELECT pair_id, command, success, duration_ms, error, created_at
		 FROM run_history
		 WHERE project_id = ?
		 ORDER BY created_at DESC
		 LIMIT 1`,
		[projectId]
	);

	let lastRun: RunRecord | undefined;
	if (lastResult.length > 0 && lastResult[0].values.length > 0) {
		const row = lastResult[0].values[0];
		lastRun = {
			date: row[5] as string,
			command: row[1] as 'reference' | 'test' | 'approve',
			pairId: row[0] as string,
			success: row[2] === 1,
			durationMs: row[3] as number,
			error: (row[4] as string) ?? undefined
		};
	}

	return {
		totalRuns: total,
		successRate: Math.round((successful / total) * 100),
		avgDurationMs: Math.round(avgDuration ?? 0),
		lastRun
	};
}

export function getAllStats(): Record<
	string,
	{
		totalRuns: number;
		successRate: number;
		avgDurationMs: number;
		lastRun?: RunRecord;
	}
> {
	const database = getDbSync();
	const result = database.exec('SELECT DISTINCT project_id FROM run_history');

	if (result.length === 0) return {};

	const stats: Record<
		string,
		{ totalRuns: number; successRate: number; avgDurationMs: number; lastRun?: RunRecord }
	> = {};

	for (const row of result[0].values) {
		const projectId = row[0] as string;
		stats[projectId] = getProjectStats(projectId);
	}

	return stats;
}

export function getEstimatedDuration(
	projectId: string,
	pairId: string,
	command: 'reference' | 'test' | 'approve'
): number | null {
	const database = getDbSync();

	const exact = database.exec(
		`SELECT duration_ms FROM run_history
		 WHERE project_id = ? AND pair_id = ? AND command = ? AND success = 1
		 ORDER BY created_at DESC
		 LIMIT 1`,
		[projectId, pairId, command]
	);

	if (exact.length > 0 && exact[0].values.length > 0) {
		return exact[0].values[0][0] as number;
	}

	const commandMatch = database.exec(
		`SELECT duration_ms FROM run_history
		 WHERE project_id = ? AND command = ? AND success = 1
		 ORDER BY created_at DESC
		 LIMIT 1`,
		[projectId, command]
	);

	if (commandMatch.length > 0 && commandMatch[0].values.length > 0) {
		return commandMatch[0].values[0][0] as number;
	}

	const anyMatch = database.exec(
		`SELECT duration_ms FROM run_history
		 WHERE project_id = ? AND success = 1
		 ORDER BY created_at DESC
		 LIMIT 1`,
		[projectId]
	);

	return anyMatch.length > 0 && anyMatch[0].values.length > 0
		? (anyMatch[0].values[0][0] as number)
		: null;
}

export function getEstimatesForQueue(
	jobs: Array<{ projectId: string; pairId: string; command: 'reference' | 'test' | 'approve' }>
): Map<string, number | null> {
	const estimates = new Map<string, number | null>();

	for (const job of jobs) {
		const key = `${job.projectId}-${job.pairId}-${job.command}`;
		if (!estimates.has(key)) {
			estimates.set(key, getEstimatedDuration(job.projectId, job.pairId, job.command));
		}
	}

	return estimates;
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
		dbInitPromise = null;
	}
}

export { initDb };
