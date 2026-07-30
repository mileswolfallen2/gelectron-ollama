import { GelectronOllama } from '../dist'
import { app } from './mock/gelectron'

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
