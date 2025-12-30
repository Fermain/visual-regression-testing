module.exports = async (page, scenario) => {
	// Helper to prefix all logs with scenario label
	const log = (msg) => console.log(`[${scenario.label}] ${msg}`);

	log('onReady started');

	// 1. FREEZE ALL CSS ANIMATIONS AND TRANSITIONS
	// This prevents timing-based visual differences
	log('Freezing CSS animations and transitions...');
	await page.addStyleTag({
		content: `
			*, *::before, *::after {
				animation-duration: 0s !important;
				animation-delay: 0s !important;
				transition-duration: 0s !important;
				transition-delay: 0s !important;
			}
			/* Also pause any running animations */
			* {
				animation-play-state: paused !important;
			}
		`
	});

	// 2. PAUSE SLICK SLIDERS
	// Slick carousel auto-rotation causes visual differences
	const slickCount = await page.evaluate(() => {
		const sliders = document.querySelectorAll('.slick-slider');
		let paused = 0;
		sliders.forEach((slider) => {
			try {
				// jQuery Slick API
				if (window.jQuery && window.jQuery(slider).slick) {
					window.jQuery(slider).slick('slickPause');
					paused++;
				}
			} catch {}
		});
		return { total: sliders.length, paused };
	});
	if (slickCount.total > 0) {
		log(`Paused ${slickCount.paused}/${slickCount.total} Slick slider(s)`);
	}

	// 3. CLICK SELECTOR (e.g., cookie consent)
	if (scenario.clickSelector) {
		const selector = scenario.clickSelector;
		log(`Looking for clickSelector: ${selector}`);
		try {
			await page.waitForSelector(selector, { timeout: 5000 });
			log(`Found ${selector}, clicking...`);
			await page.click(selector);
			log(`Clicked ${selector}`);
		} catch (e) {
			log(`Could not find or click ${selector}: ${e.message}`);
		}
	}

	// 4. POST-INTERACTION WAIT
	if (scenario.postInteractionWait) {
		log(`Waiting ${scenario.postInteractionWait}ms (postInteractionWait)...`);
		await new Promise((r) => setTimeout(r, scenario.postInteractionWait));
	}

	// 5. HIDE DYNAMIC CONTENT SELECTORS
	// Elements that change between runs (timestamps, counters, ads, etc.)
	if (scenario.hideSelectors && scenario.hideSelectors.length > 0) {
		log(`Hiding ${scenario.hideSelectors.length} dynamic selector(s)...`);
		await page.evaluate((selectors) => {
			selectors.forEach((sel) => {
				document.querySelectorAll(sel).forEach((el) => {
					el.style.visibility = 'hidden';
				});
			});
		}, scenario.hideSelectors);
	}

	// 6. FORCE LAZY MEDIA TO LOAD
	log('Forcing lazy media to load...');
	const mediaInfo = await page.evaluate(() => {
		// Remove native lazy loading
		document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
			img.removeAttribute('loading');
		});
		document.querySelectorAll('video[loading="lazy"]').forEach((vid) => {
			vid.removeAttribute('loading');
		});

		// Handle common lazy-load patterns (data-src, data-lazy-src, etc.)
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

		// Handle srcset lazy loading
		document.querySelectorAll('img[data-srcset]').forEach((img) => {
			if (img.dataset.srcset) {
				img.srcset = img.dataset.srcset;
			}
		});

		// Handle background images in data attributes
		document.querySelectorAll('[data-bg], [data-background-image]').forEach((el) => {
			const bg = el.dataset.bg || el.dataset.backgroundImage;
			if (bg) {
				el.style.backgroundImage = `url(${bg})`;
			}
		});

		const images = document.querySelectorAll('img');

		// Nudge videos to load first frame and stop autoplay
		const videos = document.querySelectorAll('video');
		videos.forEach((vid) => {
			vid.autoplay = false;
			vid.removeAttribute('autoplay');
			vid.preload = 'auto';
			try {
				vid.pause();
				vid.currentTime = 0;
			} catch {}
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

		// Handle video.js players if present
		if (window.videojs) {
			document.querySelectorAll('.video-js').forEach((el) => {
				try {
					const player = window.videojs(el);
					if (player) {
						player.autoplay(false);
						player.pause();
						player.currentTime(0);
					}
				} catch {}
			});
		}

		return {
			total: images.length,
			withDataSrc: document.querySelectorAll('img[data-src]').length,
			withLazyLoading: document.querySelectorAll('img[loading="lazy"]').length,
			videos: videos.length
		};
	});
	log(`Media info: ${JSON.stringify(mediaInfo)}`);

	// 7. WAIT FOR NETWORK IDLE
	// Wait for all network requests to settle (no requests for 500ms)
	log('Waiting for network idle...');
	try {
		await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
		log('Network is idle.');
	} catch (e) {
		log(`Network idle timeout (continuing anyway): ${e.message}`);
	}

	// 8. WAIT FOR ALL MEDIA TO LOAD
	log('Waiting for media to load...');
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
	log('Media loading complete.');

	// 9. FINAL SETTLE TIME
	// Allow layout to stabilize after all loading
	await new Promise((resolve) => setTimeout(resolve, 800));
	log('Ready for screenshot.');
};
