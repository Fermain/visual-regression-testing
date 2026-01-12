import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeUrl, executeCheck } from './link-checker';

// Mock linkinator
const mockCheck = vi.fn();
const mockOn = vi.fn();

vi.mock('linkinator', () => {
	class MockLinkChecker {
		check = mockCheck;
		on = mockOn;
	}
	return {
		LinkChecker: MockLinkChecker,
		LinkState: {
			OK: 'OK',
			BROKEN: 'BROKEN',
			SKIPPED: 'SKIPPED'
		}
	};
});

describe('normalizeUrl', () => {
	it('should remove default ignored parameters', () => {
		const url = 'https://example.com/page?ver=1.2.3&v=1&_=123456&t=999&timestamp=999&cache=0&cb=0&nocache=1&keep=me';
		const normalized = normalizeUrl(url, []);
		
		const parsed = new URL(normalized);
		expect(parsed.searchParams.has('ver')).toBe(false);
		expect(parsed.searchParams.has('v')).toBe(false);
		expect(parsed.searchParams.has('_')).toBe(false);
		expect(parsed.searchParams.has('keep')).toBe(true);
		expect(parsed.searchParams.get('keep')).toBe('me');
	});

	it('should remove custom ignored parameters', () => {
		const url = 'https://example.com/page?custom=remove&keep=this';
		const normalized = normalizeUrl(url, ['custom']);
		
		const parsed = new URL(normalized);
		expect(parsed.searchParams.has('custom')).toBe(false);
		expect(parsed.searchParams.has('keep')).toBe(true);
	});

	it('should sort parameters for consistent comparison', () => {
		const url1 = 'https://example.com/page?b=2&a=1';
		const url2 = 'https://example.com/page?a=1&b=2';
		
		expect(normalizeUrl(url1, [])).toBe(normalizeUrl(url2, []));
		expect(normalizeUrl(url1, [])).toBe('https://example.com/page?a=1&b=2');
	});

	it('should return original string if URL is invalid', () => {
		const invalid = 'not-a-url';
		expect(normalizeUrl(invalid, [])).toBe(invalid);
	});

	it('should handle URLs without parameters', () => {
		const url = 'https://example.com/page';
		expect(normalizeUrl(url, [])).toBe(url);
	});
});

describe('executeCheck', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should call linkinator with correct parameters', async () => {
		mockCheck.mockResolvedValue({
			links: [
				{ url: 'https://example.com/1', state: 'OK', status: 200 },
				{ url: 'https://example.com/2', state: 'BROKEN', status: 404 }
			]
		});

		const result = await executeCheck(
			'https://example.com',
			['/', '/about'],
			{ maxConcurrency: 5, timeout: 10, exclude: ['skip-me'] }
		);

		expect(mockCheck).toHaveBeenCalledWith({
			path: ['https://example.com/', 'https://example.com/about'],
			recurse: false,
			concurrency: 5,
			timeout: 10000,
			linksToSkip: ['skip-me'],
			retry: true,
			retryErrors: true,
			retryErrorsCount: 3
		});

		expect(result.url).toBe('https://example.com');
		expect(result.total).toBe(2);
		expect(result.failed).toBe(1);
	});

	it('should report progress via callback', async () => {
		mockCheck.mockResolvedValue({ links: [] });
		
		// Simulate a link event
		mockOn.mockImplementation((event, callback) => {
			if (event === 'link') {
				callback({ url: 'https://example.com/p1', state: 'OK', status: 200 });
			}
		});

		const progressCallback = vi.fn();
		await executeCheck('https://example.com', ['/'], {}, progressCallback);

		expect(progressCallback).toHaveBeenCalledWith(1, 'https://example.com/p1');
	});
});
