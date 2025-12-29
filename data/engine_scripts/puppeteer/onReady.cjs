module.exports = async (page, scenario) => {
	console.log('onReady: ' + scenario.label);

	// Click the specified selector if it exists (e.g., cookie consent)
	if (scenario.clickSelector) {
		const selector = scenario.clickSelector;
		console.log(`Looking for clickSelector: ${selector}`);
		try {
			await page.waitForSelector(selector, { timeout: 5000 });
			console.log(`Found ${selector}, clicking...`);
			await page.click(selector);
			console.log(`Clicked ${selector}`);
		} catch (e) {
			console.log(`Could not find or click ${selector}: ${e.message}`);
		}
	}

	// Wait after interaction
	if (scenario.postInteractionWait) {
		console.log(`Waiting ${scenario.postInteractionWait}ms (postInteractionWait)...`);
		await new Promise((r) => setTimeout(r, scenario.postInteractionWait));
	}

	// Force lazy images to load
	console.log('Forcing lazy images to load...');
	const imageInfo = await page.evaluate(() => {
		// 1. Remove native lazy loading
		document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
			img.removeAttribute('loading');
		});

		// 2. Handle common lazy-load patterns (data-src, data-lazy-src, etc.)
		document.querySelectorAll('img[data-src], img[data-lazy-src], img[data-original]').forEach((img) => {
			const lazySrc = img.dataset.src || img.dataset.lazySrc || img.dataset.original;
			if (lazySrc && (!img.src || img.src.includes('data:') || img.src.includes('placeholder'))) {
				img.src = lazySrc;
			}
		});

		// 3. Handle srcset lazy loading
		document.querySelectorAll('img[data-srcset]').forEach((img) => {
			if (img.dataset.srcset) {
				img.srcset = img.dataset.srcset;
			}
		});

		// 4. Handle background images in data attributes
		document.querySelectorAll('[data-bg], [data-background-image]').forEach((el) => {
			const bg = el.dataset.bg || el.dataset.backgroundImage;
			if (bg) {
				el.style.backgroundImage = `url(${bg})`;
			}
		});

		// 5. Scroll each image into view to trigger any remaining JS lazy loaders
		const images = document.querySelectorAll('img');
		images.forEach((img) => {
			img.scrollIntoView({ block: 'center', behavior: 'instant' });
		});

		// 6. Return to top
		window.scrollTo(0, 0);

		return {
			total: images.length,
			withDataSrc: document.querySelectorAll('img[data-src]').length,
			withLazyLoading: document.querySelectorAll('img[loading="lazy"]').length
		};
	});
	console.log('Image info:', JSON.stringify(imageInfo));

	// Wait for images to load after forcing
	console.log('Waiting for images to load...');
	await page.evaluate(() => {
		return new Promise((resolve) => {
			const images = Array.from(document.querySelectorAll('img'));
			let loaded = 0;
			const total = images.length;

			if (total === 0) {
				resolve();
				return;
			}

			const checkDone = () => {
				loaded++;
				if (loaded >= total) resolve();
			};

			images.forEach((img) => {
				if (img.complete) {
					checkDone();
				} else {
					img.onload = checkDone;
					img.onerror = checkDone;
				}
			});

			// Timeout after 10 seconds
			setTimeout(resolve, 10000);
		});
	});
	console.log('Image loading complete.');
};
