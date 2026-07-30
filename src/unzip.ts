import yauzl from 'yauzl';
import * as fs from 'fs';
import * as path from 'path';

function mkdirp(dir: string, cb: (err?: Error) => void) {
  if (dir === '.') return cb();
  fs.mkdir(dir, { recursive: true }, function (err) {
    cb(err || undefined);
  });
}

export async function unzipFile(filePath: string, outputDir: string, deleteZip: boolean = true): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, function (err, zipfile) {
      if (err) return reject(err);

      let handleCount = 0;
      function incrementHandleCount() {
        handleCount++;
      }
      function decrementHandleCount() {
        handleCount--;
        if (handleCount === 0) {
          resolve();
        }
      }

      incrementHandleCount();
      zipfile.on('close', async function () {
        if (deleteZip) {
          await fs.promises.unlink(filePath).catch(() => { });
        }
        decrementHandleCount();
      });

      zipfile.readEntry();

      zipfile.on('entry', function (entry) {
        if (entry.fileName.endsWith('/')) {
          mkdirp(path.join(outputDir, entry.fileName), function (err) {
            if (err) return reject(err);
            zipfile.readEntry();
          });
        } else {
          const outPath = path.join(outputDir, entry.fileName);

          mkdirp(path.dirname(outPath), function (err) {
            if (err) return reject(err);

            zipfile.openReadStream(entry, function (err, readStream) {
              if (err) return reject(err);

              readStream.on('error', function (err) {
                return reject(err);
              });

              readStream.on('end', function () {
                zipfile.readEntry();
              });

              const writeStream = fs.createWriteStream(outPath);
              incrementHandleCount();
              writeStream.on('close', decrementHandleCount);
              writeStream.on('error', function (err) {
                return reject(err);
              });
              readStream.pipe(writeStream);
            });
          });
        }
      });

      zipfile.on('error', function (err) {
        return reject(err);
      });
    });
  });
}
