/**
 * {{nodeType}} - API client node
 * {{#if description}}{{description}}{{/if}}
 * {{#if author}}@author {{author}}{{/if}}
 */

import type { Signal, NodeConfig } from '@graph-os/core';

export interface {{pascalCase}}Config extends NodeConfig {
  /** Base URL for API */
  baseUrl?: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Request timeout in ms */
  timeout?: number;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delayMs: number;
  };
}

/**
 * {{nodeType}} - Makes HTTP API requests
 * 
 * Emits: {{upperCase}}.SUCCESS, {{upperCase}}.ERROR
 */
export class {{pascalCase}}Node {
  readonly type = '{{nodeType}}';
  readonly category = '{{category}}';
  
  private config: {{pascalCase}}Config;

  constructor(config: {{pascalCase}}Config = {}) {
    this.config = config;
  }

  /**
   * Process incoming signal as API request
   */
  async process(signal: Signal): Promise<Signal[]> {
    const requestData = signal.payload as {
      endpoint?: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: unknown;
      headers?: Record<string, string>;
    };

    const url = (this.config.baseUrl || '') + (requestData.endpoint || '');
    const method = requestData.method || 'GET';
    const headers = { ...this.config.headers, ...requestData.headers };

    try {
      const response = await this.makeRequest(url, method, headers, requestData.body);
      
      return [
        {
          type: '{{upperCase}}.SUCCESS',
          payload: {
            status: response.status,
            data: response.data,
            headers: response.headers,
          },
          timestamp: new Date(),
          sourceNodeId: signal.sourceNodeId,
        }
      ];
    } catch (error) {
      return [
        {
          type: '{{upperCase}}.ERROR',
          payload: {
            error: error instanceof Error ? error.message : String(error),
            request: { url, method },
          },
          timestamp: new Date(),
          sourceNodeId: signal.sourceNodeId,
        }
      ];
    }
  }

  private async makeRequest(
    url: string, 
    method: string, 
    headers: Record<string, string>,
    body?: unknown
  ): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }
}

export default {{pascalCase}}Node;
