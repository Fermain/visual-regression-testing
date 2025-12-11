module.exports = async (page, scenario, vp) => {
	console.log('=== onReady script executing ===');
	console.log('Scenario:', JSON.stringify(scenario, null, 2));

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
			// Wait for the element to appear (up to 10 seconds)
			await page.waitForSelector(selector, { visible: true, timeout: 10000 });
			console.log(`Found ${selector}, clicking...`);
			await page.click(selector);
			console.log(`Clicked ${selector} successfully!`);
		} catch (e) {
			console.log(`Could not find or click ${selector}: ${e.message}`);
		}
	} else {
		console.log('No clickSelector defined in scenario');
	}

	// Wait after interaction before capturing
	if (scenario.postInteractionWait) {
		console.log(`Waiting ${scenario.postInteractionWait}ms (postInteractionWait)...`);
		await new Promise(resolve => setTimeout(resolve, scenario.postInteractionWait));
	}

	console.log('=== onReady script complete ===');
};
