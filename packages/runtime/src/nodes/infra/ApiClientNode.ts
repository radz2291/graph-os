/**
 * ApiClientNode - Makes HTTP requests
 * 
 * This node makes HTTP requests to external APIs and emits
 * success or failure signals based on the response.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Configuration for ApiClientNode.
 */
interface ApiClientConfig extends NodeConfig {
  /** Base URL for API requests */
  baseUrl?: string;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** Default headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Signal type to emit on success */
  successSignalType?: string;
  /** Signal type to emit on failure */
  failureSignalType?: string;
  /** Path to extract endpoint from payload */
  endpointPath?: string;
  /** Path to extract body from payload */
  bodyPath?: string;
}

/**
 * ApiClientNode makes HTTP requests.
 */
export class ApiClientNode extends BaseNode {
  type = 'infra.api.client';
  private baseUrl: string;
  private method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  private headers: Record<string, string>;
  private timeout: number;
  private retries: number;
  private successSignalType: string;
  private failureSignalType: string;
  private endpointPath: string;
  private bodyPath: string;

  constructor(id: string, config: ApiClientConfig) {
    super(id, config);
    this.baseUrl = config.baseUrl || '';
    this.method = config.method || 'GET';
    this.headers = config.headers || {};
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 0;
    this.successSignalType = config.successSignalType || 'API.SUCCESS';
    this.failureSignalType = config.failureSignalType || 'API.FAILURE';
    this.endpointPath = config.endpointPath || 'endpoint';
    this.bodyPath = config.bodyPath || 'body';
  }

  async initialize(): Promise<void> {
    // Could set up connection pooling or other resources here
  }

  async process(signal: Signal): Promise<Signal | null> {
    const payload = signal.payload as Record<string, unknown>;
    
    // Extract endpoint from payload
    const endpoint = this.getNestedValue(payload, this.endpointPath) as string;
    const body = this.getNestedValue(payload, this.bodyPath);

    if (!endpoint) {
      return this.createOutputSignal(this.failureSignalType, {
        error: 'No endpoint specified',
        originalPayload: payload,
      });
    }

    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    // Try with retries
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await this.makeRequest(url, body);
        
        return this.createOutputSignal(this.successSignalType, {
          status: response.status,
          data: response.data,
          headers: response.headers,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on client errors (4xx)
        if ((error as { status?: number }).status?.toString().startsWith('4')) {
          break;
        }
        
        // Wait before retrying
        if (attempt < this.retries) {
          await this.delay(1000 * Math.pow(2, attempt));
        }
      }
    }

    return this.createOutputSignal(this.failureSignalType, {
      error: lastError?.message || 'Request failed',
      originalPayload: payload,
    });
  }

  /**
   * Makes an HTTP request.
   */
  private async makeRequest(
    url: string,
    body: unknown
  ): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const options: RequestInit = {
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        signal: controller.signal,
      };

      if (body && this.method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number };
        error.status = response.status;
        throw error;
      }

      return {
        status: response.status,
        data,
        headers: responseHeaders,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Gets a nested value from an object.
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  /**
   * Delays execution.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async destroy(): Promise<void> {
    // Cleanup resources if needed
  }
}
