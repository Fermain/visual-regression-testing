module.exports = async (page, scenario, vp) => {
	console.log('onBefore: ' + scenario.label);

	// Clear browser cache at the start of each scenario for a clean slate
	// This ensures broken images from previous runs don't persist
	const client = await page.target().createCDPSession();
	await client.send('Network.clearBrowserCache');
};
