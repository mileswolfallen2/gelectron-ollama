import { OllamaServerConfig } from './types';
export declare class GelectronOllamaServer {
    private process;
    private binPath;
    private log;
    constructor(config: OllamaServerConfig);
    start(executableName: string): void;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map