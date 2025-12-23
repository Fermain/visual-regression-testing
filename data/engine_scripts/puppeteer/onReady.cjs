module.exports = async (page, scenario, vp) => {
	console.log('onReady: ' + scenario.label);

	// Wait for the specified delay after page load
	if (scenario.delay) {
		console.log(`Waiting ${scenario.delay}ms (delay)...`);
		await new Promise(resolve => setTimeout(resolve, scenario.delay));
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
		await new Promise(resolve => setTimeout(resolve, scenario.postInteractionWait));
	}
};
