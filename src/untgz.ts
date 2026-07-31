import { extract } from 'tar'
import stream from 'node:stream/promises'
import { Readable } from 'stream'
import { createReadStream } from 'fs'

export async function untgzStream(tgzStream: Readable, outputDir: string): Promise<void> {
  return await stream.finished(
    tgzStream.pipe(extract({
      cwd: outputDir,
    }))
  )
}

export async function untgzFile(tgzFilePath: string, outputDir: string): Promise<void> {
  return await stream.finished(
    createReadStream(tgzFilePath).pipe(extract({
      cwd: outputDir,
    }))
  )
}
