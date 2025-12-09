const canonicalBase = process.env.CANONICAL_URL;
const candidateBase = process.env.CANDIDATE_URL;

if (!canonicalBase || !candidateBase) {
  throw new Error('Set CANONICAL_URL and CANDIDATE_URL before running BackstopJS.');
}

const pathList = (process.env.BACKSTOP_PATHS || '/')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const scenarios = pathList.map((entry) => {
  const label = entry === '/' ? 'root' : entry;
  return {
    label,
    referenceUrl: new URL(entry, canonicalBase).toString(),
    url: new URL(entry, candidateBase).toString(),
    selectors: process.env.BACKSTOP_SELECTOR ? [process.env.BACKSTOP_SELECTOR] : ['document'],
  };
});

module.exports = {
  id: 'visual-regression-testing',
  viewports: [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 },
  ],
  scenarios,
  engine: 'puppeteer',
  engineOptions: {
    args: ['--no-sandbox'],
  },
  report: ['browser', 'json'],
  paths: {
    bitmaps_reference: 'data/bitmaps_reference',
    bitmaps_test: 'data/bitmaps_test',
    engine_scripts: 'data/engine_scripts',
    html_report: 'data/html_report',
    ci_report: 'data/ci_report',
  },
  asyncCaptureLimit: 1,
  asyncCompareLimit: 10,
};

