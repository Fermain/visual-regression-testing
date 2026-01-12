import { describe, it, expect } from 'vitest';
import { generateSafeLabel, getBackstopConfig } from './backstop';
import type { Project, UrlPair, Settings } from '$lib/types';

describe('generateSafeLabel', () => {
	it('should return "root" for the root path', () => {
		expect(generateSafeLabel('/')).toBe('root');
	});

	it('should clean simple paths', () => {
		expect(generateSafeLabel('/about')).toBe('about');
		expect(generateSafeLabel('/services/web-design')).toBe('services_web-design');
	});

	it('should remove leading and trailing slashes', () => {
		expect(generateSafeLabel('///contact///')).toBe('contact');
	});

	it('should truncate long paths and add a hash', () => {
		const longPath = '/a'.repeat(50); // 100 characters
		const result = generateSafeLabel(longPath);

		expect(result.length).toBeLessThanOrEqual(80);
		expect(result).toMatch(/_[a-f0-9]{8}$/);
	});

	it('should generate different labels for different long paths with same prefix', () => {
		const longPath1 = '/prefix' + 'a'.repeat(100);
		const longPath2 = '/prefix' + 'b'.repeat(100);

		const label1 = generateSafeLabel(longPath1);
		const label2 = generateSafeLabel(longPath2);

		expect(label1).not.toBe(label2);
	});
});

describe('getBackstopConfig', () => {
	const mockProject: Project = {
		id: 'p1',
		name: 'Project 1',
		paths: ['/', '/about'],
		delay: 5000,
		clickSelector: '#button',
		postInteractionWait: 1000,
		hideSelectors: ['.ads']
	};

	const mockUrlPair: UrlPair = {
		id: 'pair-1',
		canonicalUrl: 'https://prod.com',
		candidateUrl: 'https://stage.com'
	};

	const mockSettings: Settings = {
		viewports: [{ label: 'desktop', width: 1440, height: 900 }],
		urlPairs: [mockUrlPair],
		asyncCaptureLimit: 3,
		asyncCompareLimit: 12,
		waitTimeout: 60000,
		gotoTimeout: 60000
	};

	it('should generate a valid backstop config', () => {
		const config = getBackstopConfig(mockProject, mockUrlPair, mockSettings);

		expect(config.id).toMatch(/^bs_[a-f0-9]{12}$/);
		expect(config.viewports).toEqual(mockSettings.viewports);
		expect(config.scenarios).toHaveLength(2);

		const scenario = config.scenarios[0];
		expect(scenario.label).toBe('root');
		expect(scenario.url).toBe('https://stage.com/');
		expect(scenario.referenceUrl).toBe('https://prod.com/');
		expect(scenario.delay).toBe(5000);
		expect(scenario.clickSelector).toBe('#button');
		expect(scenario.postInteractionWait).toBe(1000);
		expect(scenario.hideSelectors).toEqual(['.ads']);

		expect(config.asyncCaptureLimit).toBe(3);
		expect(config.asyncCompareLimit).toBe(12);
		expect(config.engineOptions.waitTimeout).toBe(60000);
	});

	it('should handle missing optional project fields with defaults', () => {
		const minimalProject: Project = {
			id: 'p2',
			name: 'Minimal',
			paths: ['/']
		};

		const config = getBackstopConfig(minimalProject, mockUrlPair, mockSettings);
		const scenario = config.scenarios[0];

		expect(scenario.delay).toBe(3000); // Default delay
		expect(scenario.clickSelector).toBeUndefined();
		expect(scenario.postInteractionWait).toBeUndefined();
		expect(scenario.hideSelectors).toBeUndefined();
	});
});
