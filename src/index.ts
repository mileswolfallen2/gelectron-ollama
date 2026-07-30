import * as path from 'path';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as os from 'os';
import { githubFetch } from './github-fetch';
import { unzipFile } from './unzip';
import { untgzStream } from './untgz';
import { GelectronOllamaConfig, PlatformConfig, OllamaAssetMetadata, GitHubRelease, SpecificVersion, Version } from './types';
import { GelectronOllamaServer } from './server';
import { Transform, Readable } from 'stream';
import { pipeline } from 'stream/promises';

export type { GelectronOllamaConfig, PlatformConfig, OllamaAssetMetadata, SpecificVersion, Version };
export { GelectronOllamaServer };

export class GelectronOllama {
  private config: GelectronOllamaConfig;
  private server: GelectronOllamaServer | null = null;

  constructor(config: GelectronOllamaConfig) {
    this.config = {
      directory: 'gelectron-ollama',
      ...config,
    };
  }

  public currentPlatformConfig(): PlatformConfig {
    const platform = os.platform();
    const arch = os.arch();

    let osType: 'windows' | 'darwin' | 'linux';
    let architecture: 'arm64' | 'amd64';

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

  public getAssetName(platformConfig: PlatformConfig): string {
    const { os, arch: architecture } = platformConfig;

    switch (os) {
      case 'windows':
        return `ollama-windows-${architecture}.zip`;
      case 'darwin':
        return 'ollama-darwin.tgz';
      case 'linux':
        return `ollama-linux-${architecture}.tgz`;
    }
  }

  public async getMetadata(
    version: Version = 'latest',
    platformConfig: PlatformConfig = this.currentPlatformConfig()
  ): Promise<OllamaAssetMetadata> {
    const { os, arch: architecture } = platformConfig;

    const releaseUrlPath = version === 'latest' ? 'latest' : `tags/${version}`;
    const gitHubResponse = await githubFetch(`https://api.github.com/repos/ollama/ollama/releases/${releaseUrlPath}`);
    const releaseData = await gitHubResponse.json() as GitHubRelease;
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
      version: releaseData.tag_name as SpecificVersion,
      downloads: asset.download_count,
      downloadUrl: asset.browser_download_url,
      releaseUrl: releaseData.html_url,
      body: releaseData.body,
    };
  }

  public async download(
    version: Version = 'latest',
    platformConfig: PlatformConfig = this.currentPlatformConfig(),
    {
      log
    }: {
      log?: (percent: number, message: string) => void;
    } = {},
  ): Promise<void> {
    const metadata = await this.getMetadata(version, platformConfig);
    const versionDir = this.getBinPath(metadata.version, platformConfig);

    log?.(0, 'Creating directory');
    await fs.mkdir(versionDir, { recursive: true });

    log?.(0, `Downloading ${metadata.fileName} (${metadata.sizeMB}MB)`);
    const response = await fetch(metadata.downloadUrl);

    let downloadedBytes = 0;
    const totalBytes = metadata.size;
    let lastLoggedPercent = 0;

    const progressStream = new Transform({
      transform(chunk, _encoding, callback) {
        downloadedBytes += chunk.length;

        const currentPercent = Math.floor((downloadedBytes / totalBytes) * 100);
        if (currentPercent > lastLoggedPercent) {
          if (currentPercent < 100) {
            log?.(currentPercent, `Downloading ${metadata.fileName} (${(downloadedBytes / 1024 / 1024).toFixed(1)}MB / ${metadata.sizeMB}MB) ${currentPercent}%`);
          } else {
            log?.(100, `Extracting ${metadata.fileName} (${metadata.sizeMB}MB)`);
          }
          lastLoggedPercent = currentPercent;
        }

        callback(null, chunk);
      }
    });

    if (!response.body) {
      throw new Error('Response body is not readable');
    }

    const nodeStream = Readable.fromWeb(response.body);
    nodeStream.pipe(progressStream);

    if (metadata.contentType === 'application/zip') {
      const filePath = path.join(versionDir, metadata.fileName);
      const writeStream = createWriteStream(filePath);

      await pipeline(progressStream, writeStream);

      await unzipFile(filePath, versionDir, true);
    } else if (['application/x-gtar', 'application/x-tar', 'application/x-gzip', 'application/tar', 'application/gzip', 'application/x-tgz'].includes(metadata.contentType)) {
      await untgzStream(progressStream, versionDir);
    } else {
      throw new Error(`The Ollama asset type ${metadata.contentType} is not supported`);
    }

    log?.(100, `Extracted archive ${metadata.fileName}`);
  }

  public async isDownloaded(version: SpecificVersion, platformConfig: PlatformConfig = this.currentPlatformConfig()): Promise<boolean> {
    const binPath = this.getBinPath(version, platformConfig);
    const executableName = this.getExecutableName(platformConfig);
    return fs.access(path.join(binPath, executableName)).then(() => true).catch(() => false);
  }

  public async downloadedVersions(platformConfig: PlatformConfig = this.currentPlatformConfig()): Promise<string[]> {
    let versions: string[] = []
    try {
      versions = await fs.readdir(path.join(this.config.basePath, this.config.directory!));
    } catch {
      return []
    }

    const downloaded = await Promise.all(versions.map((version) => this.isDownloaded(version as SpecificVersion, platformConfig)));
    return versions.filter((_version, index) => downloaded[index]);
  }

  public getBinPath(version: SpecificVersion, platformConfig: PlatformConfig = this.currentPlatformConfig()): string {
    return path.join(
      this.config.basePath,
      this.config.directory!,
      version,
      platformConfig.os,
      platformConfig.arch,
    );
  }

  public getExecutableName(platformConfig: PlatformConfig): string {
    switch (platformConfig.os) {
      case 'windows':
        return 'ollama.exe';
      case 'darwin':
        return 'ollama';
      case 'linux':
        return 'bin/ollama';
    }
  }

  public async serve(
    version: SpecificVersion,
    {
      serverLog,
      downloadLog,
      timeoutSec = 5
    }: {
      serverLog?: (message: string) => void;
      downloadLog?: (percent: number, message: string) => void;
      timeoutSec?: number
    } = {}
  ): Promise<void> {
    const platformConfig = this.currentPlatformConfig();
    const binPath = this.getBinPath(version, platformConfig);

    const intervalMs = 100;
    const intervalCount = Math.ceil(timeoutSec * 1000 / intervalMs);

    if (!await this.isDownloaded(version, platformConfig)) {
      await this.download(version, platformConfig, { log: downloadLog || (() => { }) });
    }

    this.server = new GelectronOllamaServer({
      binPath,
      log: serverLog || (() => { }),
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

  public getServer(): GelectronOllamaServer | null {
    return this.server || null;
  }

  public async isRunning(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:11434');
      const text = await response.text();
      return text.includes('Ollama is running');
    } catch {
      return false;
    }
  }
}

export default GelectronOllama;
