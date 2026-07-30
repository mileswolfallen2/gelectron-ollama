import { GelectronOllama } from '../dist'
import { app } from './mock/gelectron'

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
