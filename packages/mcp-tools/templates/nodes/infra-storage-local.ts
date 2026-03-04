/**
 * {{nodeType}} - Local storage node
 * {{#if description}}{{description}}{{/if}}
 * {{#if author}}@author {{author}}{{/if}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  /** Storage key prefix */
  keyPrefix?: string;
  /** Storage type */
  storageType?: 'localStorage' | 'sessionStorage' | 'memory';
  /** Default TTL in seconds */
  defaultTtl?: number;
  /** Maximum storage size in bytes */
  maxSize?: number;
}

interface StorageEntry {
  value: unknown;
  expiresAt?: number;
}

/**
 * {{nodeType}} - Manages local storage operations
 * 
 * Emits: {{upperCase}}.SAVED, {{upperCase}}.LOADED, {{upperCase}}.DELETED
 */
export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  private config: {{pascalCase}}Config;
  private memoryStorage = new Map<string, StorageEntry>();

  constructor(config: {{pascalCase}}Config = {}) {
    this.config = config;
  }

  /**
   * Process storage operation
   */
  async process(signal: Signal): Promise<Signal[]> {
    const operation = signal.payload as {
      action: 'get' | 'set' | 'delete' | 'clear';
      key: string;
      value?: unknown;
      ttl?: number;
    };

    const fullKey = (this.config.keyPrefix || '') + operation.key;

    switch (operation.action) {
      case 'set':
        return this.set(fullKey, operation.value, operation.ttl, signal.sourceNodeId);
      case 'get':
        return this.get(fullKey, signal.sourceNodeId);
      case 'delete':
        return this.delete(fullKey, signal.sourceNodeId);
      case 'clear':
        return this.clear(signal.sourceNodeId);
      default:
        return [];
    }
  }

  private set(key: string, value: unknown, ttl?: number, sourceNodeId?: string): Signal[] {
    const entry: StorageEntry = {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : 
        this.config.defaultTtl ? Date.now() + this.config.defaultTtl * 1000 : undefined,
    };

    this.getStorage().setItem(key, JSON.stringify(entry));

    return [
      {
        type: '{{upperCase}}.SAVED',
        payload: { key, saved: true },
        timestamp: new Date(),
        sourceNodeId: sourceNodeId || 'unknown',
      }
    ];
  }

  private get(key: string, sourceNodeId?: string): Signal[] {
    const raw = this.getStorage().getItem(key);
    
    if (!raw) {
      return [
        {
          type: '{{upperCase}}.LOADED',
          payload: { key, value: null, found: false },
          timestamp: new Date(),
          sourceNodeId: sourceNodeId || 'unknown',
        }
      ];
    }

    const entry = JSON.parse(raw) as StorageEntry;
    
    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.getStorage().removeItem(key);
      return [
        {
          type: '{{upperCase}}.LOADED',
          payload: { key, value: null, found: false, expired: true },
          timestamp: new Date(),
          sourceNodeId: sourceNodeId || 'unknown',
        }
      ];
    }

    return [
      {
        type: '{{upperCase}}.LOADED',
        payload: { key, value: entry.value, found: true },
        timestamp: new Date(),
        sourceNodeId: sourceNodeId || 'unknown',
      }
    ];
  }

  private delete(key: string, sourceNodeId?: string): Signal[] {
    this.getStorage().removeItem(key);
    
    return [
      {
        type: '{{upperCase}}.DELETED',
        payload: { key, deleted: true },
        timestamp: new Date(),
        sourceNodeId: sourceNodeId || 'unknown',
      }
    ];
  }

  private clear(sourceNodeId?: string): Signal[] {
    this.getStorage().clear();
    
    return [
      {
        type: '{{upperCase}}.CLEARED',
        payload: { cleared: true },
        timestamp: new Date(),
        sourceNodeId: sourceNodeId || 'unknown',
      }
    ];
  }

  private getStorage(): Storage {
    switch (this.config.storageType) {
      case 'sessionStorage':
        return typeof sessionStorage !== 'undefined' ? sessionStorage : this.createMemoryStorage();
      case 'memory':
        return this.createMemoryStorage();
      default:
        return typeof localStorage !== 'undefined' ? localStorage : this.createMemoryStorage();
    }
  }

  private createMemoryStorage(): Storage {
    const storage = {
      getItem: (key: string) => {
        const entry = this.memoryStorage.get(key);
        return entry ? JSON.stringify(entry) : null;
      },
      setItem: (key: string, value: string) => {
        this.memoryStorage.set(key, JSON.parse(value));
      },
      removeItem: (key: string) => {
        this.memoryStorage.delete(key);
      },
      clear: () => {
        this.memoryStorage.clear();
      },
      key: (index: number) => {
        const keys = Array.from(this.memoryStorage.keys());
        return keys[index] || null;
      },
      length: this.memoryStorage.size,
    } as Storage;
    return storage;
  }
}

export default {{pascalCase}}Node;
