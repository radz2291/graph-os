/**
 * BrowserStorageNode - Simulates local file storage using localStorage
 * 
 * This node provides a drop-in replacement for infra.storage.local
 * in browser environments, mimicking fs behavior using window.localStorage.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig, NodeContext } from '@graph-os/core';

/**
 * Configuration for BrowserStorageNode.
 */
interface StorageConfig extends NodeConfig {
    /** Base directory (used as a namespace prefix in localStorage) */
    baseDir?: string;
    /** Operation type */
    operation?: 'read' | 'write' | 'delete' | 'exists';
    /** Signal type to emit on success */
    successSignalType?: string;
    /** Signal type to emit on failure */
    failureSignalType?: string;
}

/**
 * BrowserStorageNode handles file system operations using localStorage.
 */
export class BrowserStorageNode extends BaseNode {
    type = 'infra.storage.local'; // Mimics the server-side type exactly
    private baseDir: string;
    private defaultOperation: 'read' | 'write' | 'delete' | 'exists';
    private successSignalType: string;
    private failureSignalType: string;

    constructor(id: string, config: StorageConfig) {
        super(id, config);

        // Normalize baseDir to remove leading/trailing slashes and defaults to 'storage'
        let dir = config.baseDir || 'storage';
        dir = dir.replace(/^[\/\\]+|[\/\\]+$/g, '');
        this.baseDir = dir;

        this.defaultOperation = config.operation || 'read';
        this.successSignalType = config.successSignalType || 'STORAGE.SUCCESS';
        this.failureSignalType = config.failureSignalType || 'STORAGE.FAILURE';
    }

    async initialize(context?: NodeContext): Promise<void> {
        await super.initialize(context);

        if (typeof window === 'undefined' || !window.localStorage) {
            this.context?.logger.warn(
                `[BrowserStorageNode:${this.id}] localStorage is not available in this environment.`
            );
        }
    }

    /**
     * Generates a namespaced localStorage key based on path semantics.
     */
    private getStorageKey(filePath: string): string {
        // Normalize the path by removing leading/relative dot-slash combinations
        const normalizedPath = filePath.replace(/^(\.\/|\/)+/, '');
        return `graph-os-storage://${this.baseDir}/${normalizedPath}`;
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

        const storageKey = this.getStorageKey(filePath);

        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                throw new Error('localStorage is not defined (not running in a browser environment)');
            }

            let result: unknown;

            switch (operation) {
                case 'read':
                    result = await this.readFile(storageKey);
                    break;
                case 'write': {
                    const rawData = payload.data;
                    const dataToWrite = typeof rawData === 'object' && rawData !== null
                        ? JSON.stringify(rawData)
                        : String(rawData);

                    result = await this.writeFile(storageKey, dataToWrite);
                    break;
                }
                case 'delete':
                    result = await this.deleteFile(storageKey);
                    break;
                case 'exists':
                    result = await this.fileExists(storageKey);
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
                resolvedPath: storageKey,
                allowedBaseDir: this.baseDir
            });
        }
    }

    /**
     * Reads a virtual file from localStorage.
     */
    private async readFile(storageKey: string): Promise<string> {
        const content = window.localStorage.getItem(storageKey);
        if (content === null) {
            // Mimic `fs` ENOENT behavior for non-existent files
            throw new Error(`ENOENT: no such file or directory, open '${storageKey}'`);
        }
        return content;
    }

    /**
     * Writes a virtual file to localStorage.
     */
    private async writeFile(storageKey: string, data: string): Promise<{ size: number }> {
        try {
            window.localStorage.setItem(storageKey, data);
            // Rough estimation of size (characters * 2 for UTF-16)
            return { size: data.length * 2 };
        } catch (err) {
            if (err instanceof DOMException && err.name === 'QuotaExceededError') {
                throw new Error('localStorage QuotaExceededError: Insufficient space to store data.');
            }
            throw err;
        }
    }

    /**
     * Deletes a virtual file from localStorage.
     */
    private async deleteFile(storageKey: string): Promise<{ deleted: boolean }> {
        window.localStorage.removeItem(storageKey);
        return { deleted: true };
    }

    /**
     * Checks if a virtual file exists in localStorage.
     */
    private async fileExists(storageKey: string): Promise<{ exists: boolean }> {
        const content = window.localStorage.getItem(storageKey);
        return { exists: content !== null };
    }
}
