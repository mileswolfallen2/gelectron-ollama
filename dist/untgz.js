"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.untgzStream = untgzStream;
exports.untgzFile = untgzFile;
const tar_1 = require("tar");
const promises_1 = __importDefault(require("node:stream/promises"));
const fs_1 = require("fs");
async function untgzStream(tgzStream, outputDir) {
    return await promises_1.default.finished(tgzStream.pipe((0, tar_1.extract)({
        cwd: outputDir,
    })));
}
async function untgzFile(tgzFilePath, outputDir) {
    return await promises_1.default.finished((0, fs_1.createReadStream)(tgzFilePath).pipe((0, tar_1.extract)({
        cwd: outputDir,
    })));
}
//# sourceMappingURL=untgz.js.map