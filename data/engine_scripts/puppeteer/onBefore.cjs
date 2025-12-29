module.exports = async (page, scenario, vp) => {
	console.log('onBefore: ' + scenario.label);
	
	// Disable browser cache to prevent stale/broken images from persisting
	await page.setCacheEnabled(false);
};
