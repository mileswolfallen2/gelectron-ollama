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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unzipFile = unzipFile;
const yauzl_1 = __importDefault(require("yauzl"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function mkdirp(dir, cb) {
    if (dir === '.')
        return cb();
    fs.mkdir(dir, { recursive: true }, function (err) {
        cb(err || undefined);
    });
}
async function unzipFile(filePath, outputDir, deleteZip = true) {
    return new Promise((resolve, reject) => {
        yauzl_1.default.open(filePath, { lazyEntries: true }, function (err, zipfile) {
            if (err)
                return reject(err);
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
                        if (err)
                            return reject(err);
                        zipfile.readEntry();
                    });
                }
                else {
                    const outPath = path.join(outputDir, entry.fileName);
                    mkdirp(path.dirname(outPath), function (err) {
                        if (err)
                            return reject(err);
                        zipfile.openReadStream(entry, function (err, readStream) {
                            if (err)
                                return reject(err);
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
//# sourceMappingURL=unzip.js.map