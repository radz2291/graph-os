/**
 * StorageNode - Reads and writes local files
 * 
 * This node handles file system operations for reading and writing data.
 * It emits success or failure signals based on the operation result.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig, NodeContext } from '@graph-os/core';

/**
 * Configuration for StorageNode.
 */
interface StorageConfig extends NodeConfig {
  /** Base directory for file operations */
  baseDir?: string;
  /** Default file encoding */
  encoding?: BufferEncoding;
  /** Operation type */
  operation?: 'read' | 'write' | 'delete' | 'exists';
  /** Signal type to emit on success */
  successSignalType?: string;
  /** Signal type to emit on failure */
  failureSignalType?: string;
}

/**
 * StorageNode handles file system operations.
 */
export class StorageNode extends BaseNode {
  type = 'infra.storage.local';
  private baseDir: string;
  private encoding: BufferEncoding;
  private defaultOperation: 'read' | 'write' | 'delete' | 'exists';
  private successSignalType: string;
  private failureSignalType: string;

  constructor(id: string, config: StorageConfig) {
    super(id, config);
    // Path resolution will happen in initialize() to avoid synchronous top-level or constructor requires
    // We defer the resolution of baseDir to runtime instead of construction time
    this.baseDir = config.baseDir || './storage';
    this.encoding = config.encoding || 'utf-8';
    this.defaultOperation = config.operation || 'read';
    this.successSignalType = config.successSignalType || 'STORAGE.SUCCESS';
    this.failureSignalType = config.failureSignalType || 'STORAGE.FAILURE';
  }

  async initialize(context?: NodeContext): Promise<void> {
    await super.initialize(context);

    try {
      if (typeof window === 'undefined') {
        const fs = await import('fs');
        const path = await import('path');
        this.baseDir = path.resolve(process.cwd(), this.baseDir);

        // Ensure base directory exists
        if (!fs.existsSync(this.baseDir)) {
          this.context?.logger.info(`Creating storage directory: ${this.baseDir}`);
          await fs.promises.mkdir(this.baseDir, { recursive: true });
        }
      }
    } catch (e) {
      this.context?.logger.error(`StorageNode requires Node.js 'fs' and 'path' modules. It cannot run in the browser.`);
    }
  }

  async process(signal: Signal): Promise<Signal | null> {
    const payload = signal.payload as Record<string, unknown>;
    const operation = (payload.operation as string) || this.defaultOperation;
    const filePath = payload.path as string;

    if (!filePath) {
      return this.createOutputSignal(this.failureSignalType, {
        error: 'No file path specified',
        operation,
      });
    }

    let fullPath: string | undefined;

    try {
      const path = await import('path');
      // Resolve full path relative to absolute base directory
      fullPath = path.resolve(this.baseDir, filePath);

      // Security check: ensure path is within base directory
      if (!fullPath.startsWith(this.baseDir)) {
        throw new Error(`Access denied: path '${fullPath}' is outside the allowed base directory '${this.baseDir}'`);
      }

      let result: unknown;

      switch (operation) {
        case 'read':
          result = await this.readFile(fullPath);
          break;
        case 'write': {
          const rawData = payload.data;
          const dataToWrite = typeof rawData === 'object' && rawData !== null ? JSON.stringify(rawData) : String(rawData);
          result = await this.writeFile(fullPath, dataToWrite);
          break;
        }
        case 'delete':
          result = await this.deleteFile(fullPath);
          break;
        case 'exists':
          result = await this.fileExists(fullPath);
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return this.createOutputSignal(this.successSignalType, {
        operation,
        path: filePath,
        result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.context?.logger.error(`Storage operation '${operation}' failed for '${filePath}': ${errorMessage}`);

      return this.createOutputSignal(this.failureSignalType, {
        operation,
        path: filePath,
        error: errorMessage,
        resolvedPath: fullPath,
        allowedBaseDir: this.baseDir
      });
    }
  }

  /**
   * Reads a file.
   */
  private async readFile(filePath: string): Promise<string> {
    if (typeof window !== 'undefined') throw new Error("StorageNode (fs) cannot run in browser. Use BrowserStorageNode.");
    const fs = await import('fs');
    const content = await fs.promises.readFile(filePath, this.encoding);
    return content;
  }

  /**
   * Writes a file.
   */
  private async writeFile(filePath: string, data: string): Promise<{ size: number }> {
    if (typeof window !== 'undefined') throw new Error("StorageNode (fs) cannot run in browser. Use BrowserStorageNode.");
    const fs = await import('fs');
    await fs.promises.writeFile(filePath, data, this.encoding);
    const stats = await fs.promises.stat(filePath);
    return { size: stats.size };
  }

  /**
   * Deletes a file.
   */
  private async deleteFile(filePath: string): Promise<{ deleted: boolean }> {
    if (typeof window !== 'undefined') throw new Error("StorageNode (fs) cannot run in browser. Use BrowserStorageNode.");
    const fs = await import('fs');
    await fs.promises.unlink(filePath);
    return { deleted: true };
  }

  /**
   * Checks if a file exists.
   */
  private async fileExists(filePath: string): Promise<{ exists: boolean }> {
    if (typeof window !== 'undefined') throw new Error("StorageNode (fs) cannot run in browser. Use BrowserStorageNode.");
    const fs = await import('fs');
    const exists = fs.existsSync(filePath);
    return { exists };
  }

  async destroy(): Promise<void> {
    // Cleanup resources if needed
  }
}
