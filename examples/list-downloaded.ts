import { GelectronOllama } from '../dist'
import { app } from './mock/gelectron'

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
