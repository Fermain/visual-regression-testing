import { describe, it, expect } from 'vitest';
import { generateSafeLabel } from './backstop';

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
