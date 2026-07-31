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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GelectronOllamaServer = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
class GelectronOllamaServer {
    constructor(config) {
        this.process = null;
        this.binPath = config.binPath;
        this.log = config.log;
    }
    start(executableName) {
        this.process = (0, child_process_1.spawn)(path.join(this.binPath, executableName), ['serve'], {
            cwd: this.binPath,
        });
        if (!this.process?.pid) {
            this.stop();
            this.log('Failed to start Ollama server process: ' + path.join(this.binPath, executableName));
            throw new Error('Failed to start Ollama server process');
        }
        this.log(`Ollama server pid: ${this.process.pid}`);
        this.process.stdout?.on('data', data => this.log(`${data}`));
        this.process.stderr?.on('data', data => this.log(`${data}`));
        this.process.on('error', (error) => {
            this.log(`Ollama server process error: ${error}`);
            this.process = null;
        });
        this.process.on('close', (code) => {
            this.log(`Ollama server exited with code ${code}`);
        });
    }
    stop() {
        return new Promise((resolve) => {
            if (!this.process) {
                return resolve();
            }
            const cleanup = () => {
                this.process = null;
                resolve();
            };
            const timeout = setTimeout(() => {
                this.log('Timeout waiting for Ollama server to close, forcing cleanup');
                cleanup();
            }, 5000);
            this.process.on('close', () => {
                clearTimeout(timeout);
                cleanup();
            });
            this.process.kill();
        });
    }
}
exports.GelectronOllamaServer = GelectronOllamaServer;
//# sourceMappingURL=server.js.map