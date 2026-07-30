# gelectron-ollama

A TypeScript library for integrating Ollama with Gelectron applications. This library provides a seamless way to bundle and manage Ollama within your Gelectron app for a better user experience.

## Why

Because every extra installation step creates friction, bundling Ollama ensures a smooth, seamless experience. With **gelectron-ollama**, users skip the hassle of finding installers or running commands — no separate Ollama setup required.
It detects existing Ollama instance or installs automatically if missing, so users simply open your app and it works.

## Features

- **No conflict**: Works well with standalone Ollama server (skips installation if Ollama already runs)
- **Maximum compatibility**: Can be imported by ESM and CommonJS packages
- **TypeScript Support**: Full TypeScript support with type definitions
- **Easy Integration**: Simple API for integrating Ollama with Gelectron apps
- **Binaries Management**: Automatically find and manage Ollama executables
- **Cross-Platform**: Tested on Windows, macOS, and Linux

## Installation

```bash
npm install gelectron-ollama
```

## Quick Start - Serve latest version if standalone Ollama is not running

```ts
import { GelectronOllama } from 'gelectron-ollama'
import { app } from 'gelectron'

async function main() {
  const go = new GelectronOllama({
    basePath: app.getPath('userData'),
  })

  if (!(await go.isRunning())) {
    const metadata = await go.getMetadata('latest')
    await go.serve(metadata.version, {
      serverLog: (message) => console.log('[Ollama]', message),
      downloadLog: (percent, message) => console.log('[Ollama Download]', `${percent}%`, message)
    })
  } else {
    console.log('Ollama server is already running')
  }
}

main()
```

## Configuration

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `basePath` | `string` | Yes | - | The base directory where Ollama binaries will be downloaded and stored. Typically `app.getPath('userData')` in Gelectron apps. |
| `directory` | `string` | No | `'gelectron-ollama'` | Subdirectory name within `basePath` where Ollama versions will be organized. Final path structure: `{basePath}/{directory}/{version}/{os}/{arch}/` |

## Examples

### Serve specific version of Ollama

```ts
import { GelectronOllama } from 'gelectron-ollama'
import { app } from 'gelectron'

async function main() {
  const go = new GelectronOllama({
    basePath: app.getPath('userData'),
  })

  if (!(await go.isRunning())) {
    await go.serve('v0.11.0', {
      serverLog: (message) => console.log('[Ollama]', message),
      downloadLog: (percent, message) => console.log('[Ollama Download]', `${percent}%`, message)
    })

    const liveVersion = await fetch('http://localhost:11434/api/version').then(res => res.json())
    console.log('Currently running Ollama', liveVersion)

    await go.getServer()?.stop()
  } else {
    console.log('Ollama server is already running')
  }
}

main()
```

### Download for multiple platforms

```ts
import { GelectronOllama } from 'gelectron-ollama'
import { app } from 'gelectron'

async function main() {
  const go = new GelectronOllama({
    basePath: app.getPath('userData'),
  })

  const metadata = await go.getMetadata('latest')

  await go.download(metadata.version, { os: 'windows', arch: 'arm64' })
  await go.download(metadata.version, { os: 'darwin', arch: 'arm64' })
  await go.download(metadata.version, { os: 'linux', arch: 'arm64' })

  console.log('Downloaded', metadata.version, 'for windows, mac and linux')
}

main()
```

### List downloaded versions

```ts
import { GelectronOllama } from 'gelectron-ollama'
import { app } from 'gelectron'

async function main() {
  const go = new GelectronOllama({
    basePath: app.getPath('userData'),
  })

  const currentVersion = await go.downloadedVersions()
  console.log('current platform versions', currentVersion)
  const windowsVersions = await go.downloadedVersions({ os: 'windows', arch: 'arm64' })
  console.log('windows versions', windowsVersions)
}

main()
```

## API Reference

```ts
import { GelectronOllamaConfig, PlatformConfig, OllamaAssetMetadata, SpecificVersion, Version } from './types';
import { GelectronOllamaServer } from './server';

export class GelectronOllama {
  constructor(config: GelectronOllamaConfig);

  currentPlatformConfig(): PlatformConfig;
  getAssetName(platformConfig: PlatformConfig): string;
  getMetadata(version?: Version, platformConfig?: PlatformConfig): Promise<OllamaAssetMetadata>;
  download(version?: Version, platformConfig?: PlatformConfig, { log }?: { log?: (percent: number, message: string) => void }): Promise<void>;
  isDownloaded(version: SpecificVersion, platformConfig?: PlatformConfig): Promise<boolean>;
  downloadedVersions(platformConfig?: PlatformConfig): Promise<string[]>;
  getBinPath(version: SpecificVersion, platformConfig?: PlatformConfig): string;
  getExecutableName(platformConfig: PlatformConfig): string;
  serve(version: SpecificVersion, { serverLog, downloadLog, timeoutSec }?: {
    serverLog?: (message: string) => void;
    downloadLog?: (percent: number, message: string) => void;
    timeoutSec?: number;
  }): Promise<void>;
  getServer(): GelectronOllamaServer | null;
  isRunning(): Promise<boolean>;
}
```

## Ollama Clients

- [ollama-js](https://github.com/ollama/ollama-js)

## Notes

- While the primary use case of this package is to seamlessly integrate Ollama with a Gelectron app, this package intentionally doesn't have a dependency on Gelectron itself. By simply providing a different `basePath` you can manage Ollama process on virtually any NodeJS app.
- This library does not modify Ollama binaries. The Ollama server is provided as is. gelectron-ollama is merely a convenience library to pick the appropriate binary for os/arch and start the server if needed.
- You can use gelectron-ollama as runtime dependency to manage LLM backend in the app or you can use it as part of your prebuild script to ship Ollama binaries with your app.

## License

MIT License - see [LICENSE](LICENSE) file for details.
