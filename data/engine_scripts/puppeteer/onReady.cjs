module.exports = async (page, scenario, vp) => {
	console.log('onReady: ' + scenario.label);

	// Wait for the specified delay after page load
	if (scenario.delay) {
		console.log(`Waiting ${scenario.delay}ms (delay)...`);
		await new Promise((resolve) => setTimeout(resolve, scenario.delay));
	}

	// Click the specified selector if it exists
	if (scenario.clickSelector) {
		const selector = scenario.clickSelector;
		console.log(`Looking for clickSelector: ${selector}`);

		try {
			// Wait for the element to appear (up to 5 seconds)
			await page.waitForSelector(selector, { timeout: 5000 });
			console.log(`Found ${selector}, clicking...`);
			await page.click(selector);
			console.log(`Clicked ${selector}`);
		} catch (e) {
			console.log(`Could not find or click ${selector}: ${e.message}`);
		}
	}

	// Wait after interaction before capturing
	if (scenario.postInteractionWait) {
		console.log(`Waiting ${scenario.postInteractionWait}ms (postInteractionWait)...`);
		await new Promise((resolve) => setTimeout(resolve, scenario.postInteractionWait));
	}

	// Wait for all images to load (or fail) before capturing screenshot
	console.log('Waiting for images to load...');
	try {
		await page.evaluate(async () => {
			const images = Array.from(document.querySelectorAll('img'));
			await Promise.all(
				images.map((img) => {
					if (img.complete) return Promise.resolve();
					return new Promise((resolve) => {
						img.addEventListener('load', resolve);
						img.addEventListener('error', resolve);
						// Timeout after 10 seconds per image
						setTimeout(resolve, 10000);
					});
				})
			);
		});
		console.log('Images loaded.');
	} catch (e) {
		console.log(`Image wait error (continuing anyway): ${e.message}`);
	}
};
