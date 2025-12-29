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

	// Force lazy media (images + video) to load
	console.log('Forcing lazy media to load...');
	const mediaInfo = await page.evaluate(() => {
		// 1. Remove native lazy loading
		document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
			img.removeAttribute('loading');
		});
		document.querySelectorAll('video[loading="lazy"]').forEach((vid) => {
			vid.removeAttribute('loading');
		});

		// 2. Handle common lazy-load patterns (data-src, data-lazy-src, etc.)
		document.querySelectorAll('img[data-src], img[data-lazy-src], img[data-original]').forEach((img) => {
			const lazySrc = img.dataset.src || img.dataset.lazySrc || img.dataset.original;
			if (lazySrc && (!img.src || img.src.includes('data:') || img.src.includes('placeholder'))) {
				img.src = lazySrc;
			}
		});
		document.querySelectorAll('video[data-src], video[data-lazy-src], video[data-original]').forEach((vid) => {
			const lazySrc = vid.dataset.src || vid.dataset.lazySrc || vid.dataset.original;
			if (lazySrc && (!vid.src || vid.src === '')) {
				vid.src = lazySrc;
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

		// 6. Nudge videos to load first frame and stop autoplay
		const videos = document.querySelectorAll('video');
		videos.forEach((vid) => {
			vid.autoplay = false;
			vid.removeAttribute('autoplay');
			vid.preload = 'auto';
			try {
				vid.pause();
				vid.currentTime = 0;
			} catch {}
			vid.preload = 'auto';
			try {
				vid.muted = true;
				const playPromise = vid.play();
				if (playPromise && typeof playPromise.then === 'function') {
					playPromise.then(() => {
						vid.pause();
						vid.currentTime = 0;
					}).catch(() => {
						vid.load();
					});
				}
			} catch {
				vid.load();
			}
		});

		// 6. Return to top
		window.scrollTo(0, 0);

		return {
			total: images.length,
			withDataSrc: document.querySelectorAll('img[data-src]').length,
			withLazyLoading: document.querySelectorAll('img[loading="lazy"]').length,
			videos: videos.length
		};
	});
	console.log('Media info:', JSON.stringify(mediaInfo));

	// Wait for media to load after forcing
	console.log('Waiting for media to load...');
	await page.evaluate(() => {
		return new Promise((resolve) => {
			const images = Array.from(document.querySelectorAll('img'));
			const videos = Array.from(document.querySelectorAll('video'));
			let loaded = 0;
			const total = images.length + videos.length;

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

			videos.forEach((vid) => {
				const done = () => checkDone();
				if (vid.readyState >= 2) {
					checkDone();
				} else {
					vid.addEventListener('loadeddata', done, { once: true });
					vid.addEventListener('error', done, { once: true });
				}
			});

			// Timeout after 12 seconds
			setTimeout(resolve, 12000);
		});
	});
	console.log('Media loading complete.');
};
