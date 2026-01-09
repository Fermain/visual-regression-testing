# Visual Regression Testing UI

This project provides a user-friendly interface for running visual regression tests using [BackstopJS](https://github.com/garris/BackstopJS).

It allows you to define projects (scenarios), manage paths and URLs, and execute tests directly from the browser.

## Features

- **Project Management**: Create multiple configurations for different sites or environments.
- **Easy Configuration**: UI to set Canonical (Reference) and Candidate (Test) URLs.
- **Path Management**: Simple text list for defining paths to test.
- **One-Click Execution**: Buttons to generate references, run tests, and approve changes.
- **Visual Reporting**: Integrated view of test results with diff images.

## Setup

1.  Install dependencies:

    ```bash
    npm install
    ```

2.  Start the development server:

    ```bash
    npm run dev
    ```

3.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1.  **Create a Project**: Give it a name (e.g., "My Website").
2.  **Configure**:
    - **Canonical URL**: The stable version of your site (e.g., production).
    - **Candidate URL**: The version you want to test (e.g., staging or localhost).
    - **Paths**: List the relative paths you want to capture (e.g., `/`, `/about`, `/contact`).
3.  **Run Reference**: Click "Create Reference" to capture screenshots of the Canonical site.
4.  **Run Test**: Click "Run Test" to capture screenshots of the Candidate site and compare them.
5.  **Review**: Check the results below. Failed tests will show a diff image.
6.  **Approve**: If the changes are expected, click "Approve Changes" to update the Reference bitmaps with the new ones.

## Data Storage

- Project configurations are stored in `data/projects.json`.
- Screenshots and reports are stored in `data/projects/{project-id}/`.
- You can commit `data/projects.json` to share configurations, but `data/projects/{id}` folders are typically ignored or treated as artifacts.
