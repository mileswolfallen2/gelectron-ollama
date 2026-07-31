"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GelectronOllama = exports.GelectronOllamaServer = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const fs_1 = require("fs");
const os = __importStar(require("os"));
const crypto_1 = require("crypto");
const child_process_1 = require("child_process");
const github_fetch_1 = require("./github-fetch");
const unzip_1 = require("./unzip");
const untgz_1 = require("./untgz");
const server_1 = require("./server");
Object.defineProperty(exports, "GelectronOllamaServer", { enumerable: true, get: function () { return server_1.GelectronOllamaServer; } });
const stream_1 = require("stream");
const promises_1 = require("stream/promises");
const TAR_CONTENT_TYPES = [
    'application/x-gtar',
    'application/x-tar',
    'application/x-gzip',
    'application/tar',
    'application/gzip',
    'application/x-tgz',
];
const ZSTD_CONTENT_TYPES = ['application/zstd', 'application/x-zstd', 'application/zst'];
const MIN_BINARY_SIZE_BYTES = 1024 * 1024;
function runZstd(args) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)('zstd', args, (error, _stdout, stderr) => {
            if (error) {
                reject(new Error(`zstd failed: ${error.message}${stderr ? ` (${stderr})` : ''}`));
            }
            else {
                resolve();
            }
        });
    });
}
class GelectronOllama {
    constructor(config) {
        this.server = null;
        this.config = {
            directory: 'gelectron-ollama',
            ...config,
        };
    }
    currentPlatformConfig() {
        const platform = os.platform();
        const arch = os.arch();
        let osType;
        let architecture;
        switch (platform) {
            case 'win32':
                osType = 'windows';
                break;
            case 'darwin':
                osType = 'darwin';
                break;
            case 'linux':
                osType = 'linux';
                break;
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
        switch (arch) {
            case 'arm64':
                architecture = 'arm64';
                break;
            case 'x64':
                architecture = 'amd64';
                break;
            default:
                throw new Error(`Unsupported architecture: ${arch}`);
        }
        return {
            os: osType,
            arch: architecture,
        };
    }
    getAssetName(platformConfig) {
        const { os, arch: architecture } = platformConfig;
        switch (os) {
            case 'windows':
                return `ollama-windows-${architecture}.zip`;
            case 'darwin':
                return 'ollama-darwin.tgz';
            case 'linux':
                return `ollama-linux-${architecture}.tar.zst`;
        }
    }
    async getMetadata(version = 'latest', platformConfig = this.currentPlatformConfig()) {
        const { os, arch: architecture } = platformConfig;
        const releaseUrlPath = version === 'latest' ? 'latest' : `tags/${version}`;
        const gitHubResponse = await (0, github_fetch_1.githubFetch)(`https://api.github.com/repos/ollama/ollama/releases/${releaseUrlPath}`);
        const releaseData = await gitHubResponse.json();
        const assetName = this.getAssetName(platformConfig);
        const asset = releaseData.assets.find((asset) => asset.name === assetName);
        if (!asset) {
            throw new Error(`${os}-${architecture} is not supported by Ollama ${releaseData.tag_name}`);
        }
        return {
            digest: asset.digest,
            size: asset.size,
            sizeMB: (asset.size / 1024 / 1024).toFixed(1),
            fileName: asset.name,
            contentType: asset.content_type,
            version: releaseData.tag_name,
            downloads: asset.download_count,
            downloadUrl: asset.browser_download_url,
            releaseUrl: releaseData.html_url,
            body: releaseData.body,
        };
    }
    async download(version = 'latest', platformConfig = this.currentPlatformConfig(), { log } = {}) {
        const metadata = await this.getMetadata(version, platformConfig);
        const versionDir = this.getBinPath(metadata.version, platformConfig);
        try {
            log?.(0, 'Creating directory');
            await fs.mkdir(versionDir, { recursive: true });
            log?.(0, `Downloading ${metadata.fileName} (${metadata.sizeMB}MB)`);
            const response = await fetch(metadata.downloadUrl);
            if (!response.ok) {
                throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
            }
            if (!response.body) {
                throw new Error('Response body is not readable');
            }
            let downloadedBytes = 0;
            const totalBytes = metadata.size;
            let lastLoggedPercent = 0;
            const hash = (0, crypto_1.createHash)('sha256');
            const progressStream = new stream_1.Transform({
                transform(chunk, _encoding, callback) {
                    downloadedBytes += chunk.length;
                    hash.update(chunk);
                    const currentPercent = Math.floor((downloadedBytes / totalBytes) * 100);
                    if (currentPercent > lastLoggedPercent) {
                        if (currentPercent < 100) {
                            log?.(currentPercent, `Downloading ${metadata.fileName} (${(downloadedBytes / 1024 / 1024).toFixed(1)}MB / ${metadata.sizeMB}MB) ${currentPercent}%`);
                        }
                        else {
                            log?.(100, `Extracting ${metadata.fileName} (${metadata.sizeMB}MB)`);
                        }
                        lastLoggedPercent = currentPercent;
                    }
                    callback(null, chunk);
                }
            });
            const nodeStream = stream_1.Readable.fromWeb(response.body);
            nodeStream.pipe(progressStream);
            if (metadata.contentType === 'application/zip') {
                const filePath = path.join(versionDir, metadata.fileName);
                const writeStream = (0, fs_1.createWriteStream)(filePath);
                await (0, promises_1.pipeline)(progressStream, writeStream);
                await (0, unzip_1.unzipFile)(filePath, versionDir, true);
            }
            else if (TAR_CONTENT_TYPES.includes(metadata.contentType)) {
                await (0, untgz_1.untgzStream)(progressStream, versionDir);
            }
            else if (ZSTD_CONTENT_TYPES.includes(metadata.contentType)) {
                await this.extractZstd(progressStream, metadata.fileName, versionDir);
            }
            else {
                throw new Error(`The Ollama asset type ${metadata.contentType} is not supported`);
            }
            if (!this.digestMatches(metadata.digest, hash.digest('hex'))) {
                throw new Error(`Checksum mismatch for ${metadata.fileName}: expected ${metadata.digest}`);
            }
            if (!await this.isDownloaded(metadata.version, platformConfig)) {
                throw new Error(`Extraction of ${metadata.fileName} did not produce a usable ${this.getExecutableName(platformConfig)} executable`);
            }
            log?.(100, `Extracted archive ${metadata.fileName}`);
        }
        catch (error) {
            await fs.rm(versionDir, { recursive: true, force: true });
            throw error;
        }
    }
    async extractZstd(compressedStream, fileName, versionDir) {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gelectron-ollama-'));
        try {
            const archivePath = path.join(tempDir, fileName);
            const tarPath = path.join(tempDir, 'ollama.tar');
            await (0, promises_1.pipeline)(compressedStream, (0, fs_1.createWriteStream)(archivePath));
            await runZstd(['-d', '-q', '-f', archivePath, '-o', tarPath]);
            await (0, untgz_1.untgzFile)(tarPath, versionDir);
        }
        finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }
    digestMatches(expectedDigest, actualHex) {
        const raw = expectedDigest.trim();
        const withoutPrefix = raw.startsWith('sha256:') ? raw.slice('sha256:'.length) : raw;
        if (/^[0-9a-fA-F]{64}$/.test(withoutPrefix)) {
            return withoutPrefix.toLowerCase() === actualHex.toLowerCase();
        }
        if (withoutPrefix.startsWith('sha256-')) {
            try {
                return Buffer.from(withoutPrefix.slice('sha256-'.length), 'base64').toString('hex') === actualHex.toLowerCase();
            }
            catch {
                return false;
            }
        }
        return false;
    }
    async isDownloaded(version, platformConfig = this.currentPlatformConfig()) {
        const binPath = this.getBinPath(version, platformConfig);
        const executableName = this.getExecutableName(platformConfig);
        try {
            const stat = await fs.stat(path.join(binPath, executableName));
            return stat.isFile() && (stat.mode & 0o111) !== 0 && stat.size > MIN_BINARY_SIZE_BYTES;
        }
        catch {
            return false;
        }
    }
    async downloadedVersions(platformConfig = this.currentPlatformConfig()) {
        let versions = [];
        try {
            versions = await fs.readdir(path.join(this.config.basePath, this.config.directory));
        }
        catch {
            return [];
        }
        const downloaded = await Promise.all(versions.map((version) => this.isDownloaded(version, platformConfig)));
        return versions.filter((_version, index) => downloaded[index]);
    }
    getBinPath(version, platformConfig = this.currentPlatformConfig()) {
        return path.join(this.config.basePath, this.config.directory, version, platformConfig.os, platformConfig.arch);
    }
    getExecutableName(platformConfig) {
        switch (platformConfig.os) {
            case 'windows':
                return 'ollama.exe';
            case 'darwin':
                return 'ollama';
            case 'linux':
                return 'bin/ollama';
        }
    }
    async serve(version, { serverLog, downloadLog, timeoutSec = 5 } = {}) {
        const platformConfig = this.currentPlatformConfig();
        const binPath = this.getBinPath(version, platformConfig);
        const log = serverLog || (() => { });
        if (!await this.isDownloaded(version, platformConfig)) {
            await this.download(version, platformConfig, { log: downloadLog || (() => { }) });
        }
        try {
            await this.startServerAndWait(binPath, log, timeoutSec);
        }
        catch (error) {
            // The binary may be corrupt or incompatible (e.g. an interrupted download
            // or extraction). Discard it and retry once from scratch before giving up.
            log(`Ollama failed to start (${error instanceof Error ? error.message : String(error)}); re-downloading`);
            await fs.rm(binPath, { recursive: true, force: true });
            await this.download(version, platformConfig, { log: downloadLog || (() => { }) });
            await this.startServerAndWait(binPath, log, timeoutSec);
        }
    }
    async startServerAndWait(binPath, log, timeoutSec) {
        const platformConfig = this.currentPlatformConfig();
        const intervalMs = 100;
        const intervalCount = Math.ceil(timeoutSec * 1000 / intervalMs);
        this.server = new server_1.GelectronOllamaServer({
            binPath,
            log,
        });
        this.server.start(this.getExecutableName(platformConfig));
        for (let i = 0; i < intervalCount; i++) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            if (await this.isRunning()) {
                return;
            }
        }
        throw new Error(`Ollama server failed to start in ${timeoutSec}s`);
    }
    getServer() {
        return this.server || null;
    }
    async isRunning() {
        try {
            const response = await fetch('http://localhost:11434');
            const text = await response.text();
            return text.includes('Ollama is running');
        }
        catch {
            return false;
        }
    }
}
exports.GelectronOllama = GelectronOllama;
exports.default = GelectronOllama;
//# sourceMappingURL=index.js.map