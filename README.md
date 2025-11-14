# Visual Regression Testing Suite

This is a simple, bare bones project to run BackstopJS.

The purpose is to compare two versions of a given static site, one canonical and one candidate.

## Requirements

- Node.js 18+
- HTTPS-accessible canonical and candidate URLs

## Setup

```bash
npm install
```

## Configuration

Set the targets before running BackstopJS:

- `CANONICAL_URL`: baseline site root
- `CANDIDATE_URL`: site root to compare against the baseline
- `BACKSTOP_PATHS`: optional comma separated list of paths, defaults to `/`
- `BACKSTOP_SELECTOR`: optional single selector to narrow the capture

## Usage

- `npm run reference`: capture canonical snapshots for the configured paths
- `npm test`: compare candidate snapshots against the reference set
- `npm run approve`: promote the latest candidate snapshots to the reference set

Example run:

```bash
CANONICAL_URL=https://example.com \
CANDIDATE_URL=https://staging.example.com \
BACKSTOP_PATHS="/,/pricing" \
npm test
```

Artifacts and reports land under `data/`. The HTML report opens automatically after a test run.
