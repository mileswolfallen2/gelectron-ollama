import { GelectronOllama } from '../dist'
import { app } from './mock/gelectron'

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
