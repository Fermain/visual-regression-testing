module.exports = async (page, scenario) => {
	const log = (msg) => console.log(`[${scenario.label}] ${msg}`);
	log('onReady started');

	// 1. FREEZE CSS ANIMATIONS AND TRANSITIONS
	await page.addStyleTag({
		content: `
			*, *::before, *::after {
				animation-duration: 0s !important;
				animation-delay: 0s !important;
				transition-duration: 0s !important;
				transition-delay: 0s !important;
				animation-play-state: paused !important;
			}
		`
	});

	// 2. PAUSE SLICK SLIDERS
	const slickCount = await page.evaluate(() => {
		let paused = 0;
		document.querySelectorAll('.slick-slider').forEach((slider) => {
			try {
				if (window.jQuery && window.jQuery(slider).slick) {
					window.jQuery(slider).slick('slickPause');
					paused++;
				}
			} catch {}
		});
		return paused;
	});
	if (slickCount > 0) log(`Paused ${slickCount} Slick slider(s)`);

	// 3. CLICK SELECTOR (cookie consent, modals, etc.)
	if (scenario.clickSelector) {
		try {
			await page.waitForSelector(scenario.clickSelector, { timeout: 5000 });
			await page.click(scenario.clickSelector);
			log(`Clicked: ${scenario.clickSelector}`);
		} catch (e) {
			log(`Click failed: ${scenario.clickSelector} - ${e.message}`);
		}
		// Wait for click effects
		if (scenario.postInteractionWait) {
			await new Promise((r) => setTimeout(r, scenario.postInteractionWait));
		}
	}

	// 4. HIDE DYNAMIC SELECTORS
	if (scenario.hideSelectors?.length > 0) {
		await page.evaluate((selectors) => {
			selectors.forEach((sel) => {
				document.querySelectorAll(sel).forEach((el) => {
					el.style.visibility = 'hidden';
				});
			});
		}, scenario.hideSelectors);
		log(`Hidden ${scenario.hideSelectors.length} selector(s)`);
	}

	// 5. FORCE LAZY MEDIA + FORCE SYNCHRONOUS DECODING + FREEZE VIDEOS
	const lazyInfo = await page.evaluate(() => {
		let lazified = 0;

		// Remove native lazy loading AND force synchronous decoding
		document.querySelectorAll('img').forEach((img) => {
			// Remove lazy loading
			if (img.loading === 'lazy') {
				img.removeAttribute('loading');
				lazified++;
			}
			// Force synchronous decoding - CRITICAL for consistent screenshots
			if (img.decoding === 'async') {
				img.decoding = 'sync';
			}
		});

		document.querySelectorAll('video[loading="lazy"]').forEach((el) => {
			el.removeAttribute('loading');
		});

		// data-src → src patterns
		document.querySelectorAll('img[data-src], img[data-lazy-src], img[data-original]').forEach((img) => {
			const src = img.dataset.src || img.dataset.lazySrc || img.dataset.original;
			if (src && (!img.src || img.src.includes('data:') || img.src.includes('placeholder'))) {
				img.src = src;
				lazified++;
			}
		});

		// data-srcset → srcset
		document.querySelectorAll('img[data-srcset]').forEach((img) => {
			if (img.dataset.srcset) {
				img.srcset = img.dataset.srcset;
				lazified++;
			}
		});

		// data-bg → background-image
		document.querySelectorAll('[data-bg], [data-background-image]').forEach((el) => {
			const bg = el.dataset.bg || el.dataset.backgroundImage;
			if (bg) {
				el.style.backgroundImage = `url(${bg})`;
				lazified++;
			}
		});

		// Freeze videos at frame 0
		document.querySelectorAll('video').forEach((vid) => {
			vid.autoplay = false;
			vid.preload = 'metadata';
			try { vid.pause(); vid.currentTime = 0; } catch {}
		});

		// Video.js
		if (window.videojs) {
			document.querySelectorAll('.video-js').forEach((el) => {
				try {
					const p = window.videojs(el);
					if (p) { p.pause(); p.currentTime(0); }
				} catch {}
			});
		}

		return lazified;
	});
	if (lazyInfo > 0) log(`Triggered ${lazyInfo} lazy element(s)`);

	// 6. WAIT FOR NETWORK IDLE FIRST (let all requests complete)
	try {
		await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
		log('Network idle');
	} catch (e) {
		log(`Network idle timeout: ${e.message}`);
	}

	// 7. DECODE ALL IMAGES USING img.decode() API
	// This is MORE RELIABLE than just checking naturalWidth because it
	// ensures the image is fully decoded and ready to paint
	log('Decoding images...');
	const decodeResult = await page.evaluate(() => {
		return new Promise((resolve) => {
			const images = Array.from(document.querySelectorAll('img'));
			const validImages = images.filter((img) => {
				// Skip tiny images, data URIs, and images without src
				if (!img.src || img.src.startsWith('data:')) return false;
				if (img.width < 10 && img.height < 10) return false;
				return true;
			});

			if (validImages.length === 0) {
				return resolve({ total: 0, decoded: 0, failed: 0 });
			}

			let decoded = 0;
			let failed = 0;
			const failedUrls = [];

			const checkDone = () => {
				if (decoded + failed >= validImages.length) {
					resolve({
						total: validImages.length,
						decoded,
						failed,
						failedUrls: failedUrls.slice(0, 5)
					});
				}
			};

			validImages.forEach((img) => {
				// Use decode() API if available - this ensures image is ready to paint
				if (img.decode) {
					img.decode()
						.then(() => {
							decoded++;
							checkDone();
						})
						.catch(() => {
							// If decode fails, check if it's already loaded
							if (img.complete && img.naturalWidth > 0) {
								decoded++;
							} else {
								failed++;
								failedUrls.push(img.src.slice(0, 80));
							}
							checkDone();
						});
				} else {
					// Fallback for browsers without decode()
					if (img.complete && img.naturalWidth > 0) {
						decoded++;
					} else {
						// Wait for load event
						img.onload = () => { decoded++; checkDone(); };
						img.onerror = () => { failed++; failedUrls.push(img.src.slice(0, 80)); checkDone(); };
						// Force reload if stuck
						const src = img.src;
						img.src = '';
						img.src = src;
						return; // Don't call checkDone yet
					}
					checkDone();
				}
			});

			// Timeout after 15 seconds
			setTimeout(() => {
				resolve({
					total: validImages.length,
					decoded,
					failed: validImages.length - decoded,
					timedOut: true,
					failedUrls: failedUrls.slice(0, 5)
				});
			}, 15000);
		});
	});

	log(`Decoded: ${decodeResult.decoded}/${decodeResult.total}` +
		(decodeResult.failed ? ` (${decodeResult.failed} failed)` : '') +
		(decodeResult.timedOut ? ' [timeout]' : ''));
	if (decodeResult.failedUrls?.length) {
		log(`Failed: ${decodeResult.failedUrls.join(', ')}`);
	}

	// 8. FINAL CHECK - any images still broken?
	const broken = await page.evaluate(() => {
		const bad = [];
		document.querySelectorAll('img').forEach((img) => {
			if (img.width < 10 && img.height < 10) return;
			if (!img.src || img.src.startsWith('data:')) return;
			if (img.naturalWidth === 0) {
				bad.push(img.src.slice(0, 80));
			}
		});
		return bad;
	});
	if (broken.length > 0) {
		log(`WARNING: ${broken.length} image(s) still not rendered:`);
		broken.slice(0, 5).forEach((u) => log(`  - ${u}`));
	}

	// 9. SETTLE - give browser time to paint
	await new Promise((r) => setTimeout(r, 1000));
	log('Ready');
};
