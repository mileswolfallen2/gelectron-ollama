import { GelectronOllamaConfig, PlatformConfig, OllamaAssetMetadata, SpecificVersion, Version } from './types';
import { GelectronOllamaServer } from './server';
export type { GelectronOllamaConfig, PlatformConfig, OllamaAssetMetadata, SpecificVersion, Version };
export { GelectronOllamaServer };
export declare class GelectronOllama {
    private config;
    private server;
    constructor(config: GelectronOllamaConfig);
    currentPlatformConfig(): PlatformConfig;
    getAssetName(platformConfig: PlatformConfig): string;
    getMetadata(version?: Version, platformConfig?: PlatformConfig): Promise<OllamaAssetMetadata>;
    download(version?: Version, platformConfig?: PlatformConfig, { log }?: {
        log?: (percent: number, message: string) => void;
    }): Promise<void>;
    private extractZstd;
    private digestMatches;
    isDownloaded(version: SpecificVersion, platformConfig?: PlatformConfig): Promise<boolean>;
    downloadedVersions(platformConfig?: PlatformConfig): Promise<string[]>;
    getBinPath(version: SpecificVersion, platformConfig?: PlatformConfig): string;
    getExecutableName(platformConfig: PlatformConfig): string;
    serve(version: SpecificVersion, { serverLog, downloadLog, timeoutSec }?: {
        serverLog?: (message: string) => void;
        downloadLog?: (percent: number, message: string) => void;
        timeoutSec?: number;
    }): Promise<void>;
    private startServerAndWait;
    getServer(): GelectronOllamaServer | null;
    isRunning(): Promise<boolean>;
}
export default GelectronOllama;
//# sourceMappingURL=index.d.ts.map