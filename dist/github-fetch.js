"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubFetch = githubFetch;
async function githubFetch(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub request failed: ${error}`);
    }
    return response;
}
//# sourceMappingURL=github-fetch.js.map