/**
 * Output Formatter - Token-optimized output for AI consumption
 *
 * @module @graph-os/tool/output
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Format options for output
 */
export interface FormatOptions {
  /** Output select mode */
  select?: 'summary' | 'full' | 'compact';
  /** Maximum tokens for output */
  maxTokens?: number;
  /** Output format */
  format?: 'json' | 'text';
  /** Include visual representation */
  visual?: boolean;
}

/**
 * Layered output structure
 */
export interface LayeredOutput {
  /** Layer 1: Summary (always included) */
  summary: string;
  /** Layer 1: Status */
  status: string;
  /** Layer 1: Metrics */
  metrics?: Record<string, number | boolean>;
  /** Layer 2: Primary data */
  data?: unknown;
  /** Layer 2: Visual representation */
  visual?: string;
  /** Layer 3: Issues */
  issues?: unknown[];
  /** Layer 3: Next actions */
  nextActions?: unknown[];
  /** Layer 4: Raw data */
  raw?: unknown;
}

// =============================================================================
// OUTPUT FORMATTER CLASS
// =============================================================================

/**
 * Output formatter with token optimization
 */
export class OutputFormatter {
  /**
   * Format tool result with token optimization
   */
  format(result: unknown, options: FormatOptions = {}): LayeredOutput {
    const layers = this.extractLayers(result, options);

    if (options.maxTokens) {
      this.optimizeTokens(layers, options.maxTokens);
    }

    return layers;
  }

  /**
   * Extract output layers based on select mode
   */
  private extractLayers(result: unknown, options: FormatOptions): LayeredOutput {
    const input = result as Record<string, unknown>;

    const layers: LayeredOutput = {
      summary: String(input?.summary || 'No summary'),
      status: String(input?.status || 'ok'),
    };

    // Layer 1: Always include metrics if present
    if (input?.metrics) {
      layers.metrics = input.metrics as Record<string, number | boolean>;
    }

    // Layer 2: Include data based on select mode
    if (options.select !== 'summary' && input?.data !== undefined) {
      layers.data = input.data;
    }

    // Layer 2: Include visual if requested
    if (options.visual && input?.visual) {
      layers.visual = String(input.visual);
    }

    // Layer 3: Include issues and next actions
    if (input?.issues) {
      layers.issues = input.issues as unknown[];
    }

    if (input?.nextActions) {
      layers.nextActions = input.nextActions as unknown[];
    }

    // Layer 4: Include raw data only if select is 'full'
    if (options.select === 'full' && input?.raw !== undefined) {
      layers.raw = input.raw;
    }

    return layers;
  }

  /**
   * Optimize output to fit token budget
   */
  private optimizeTokens(layers: LayeredOutput, maxTokens: number): void {
    // Estimate current token count (rough: 1 token ≈ 4 characters)
    const estimateTokens = (obj: unknown): number => {
      return Math.ceil(JSON.stringify(obj).length / 4);
    };

    let currentTokens = estimateTokens(layers);

    // Progressive truncation
    if (currentTokens > maxTokens) {
      // Remove raw data first
      if (layers.raw) {
        layers.raw = undefined;
        currentTokens = estimateTokens(layers);
      }
    }

    if (currentTokens > maxTokens) {
      // Truncate data
      if (layers.data) {
        layers.data = this.truncateData(layers.data, maxTokens / 2);
        currentTokens = estimateTokens(layers);
      }
    }

    if (currentTokens > maxTokens) {
      // Limit next actions
      if (layers.nextActions && Array.isArray(layers.nextActions)) {
        layers.nextActions = layers.nextActions.slice(0, 2);
      }
    }
  }

  /**
   * Truncate data to fit token budget
   */
  private truncateData(data: unknown, _maxTokens: number): unknown {
    if (Array.isArray(data)) {
      // Show first 3 items + "...and N more"
      if (data.length > 5) {
        return [...data.slice(0, 3), `...and ${data.length - 3} more`];
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      const keys = Object.keys(obj);

      if (keys.length > 10) {
        const truncated: Record<string, unknown> = {};
        keys.slice(0, 10).forEach(k => {
          truncated[k] = obj[k];
        });
        truncated['_truncated'] = `...${keys.length - 10} more keys`;
        return truncated;
      }
    }

    return data;
  }

  /**
   * Convert node array to compact format
   * Before: [{ id: "x", type: "logic.validate", config: {...} }]
   * After: [["x", "logic.validate"]]
   */
  compactNodes(nodes: Array<{ id: string; type: string; [key: string]: unknown }>): unknown[] {
    return nodes.map(n => [n.id, n.type]);
  }

  /**
   * Convert wire array to compact format
   * Before: [{ from: "a", to: "b", signalType: "X.Y" }]
   * After: [["a", "b", "X.Y"]]
   */
  compactWires(wires: Array<{ from: string; to: string; signalType: string }>): unknown[] {
    return wires.map(w => [w.from, w.to, w.signalType]);
  }

  /**
   * Generate ASCII diagram from topology
   */
  generateAsciiDiagram(_nodes: string[], wires: Array<[string, string, string]>): string {
    let diagram = '';
    for (const [from, to, signal] of wires) {
      diagram += `${from} --[${signal}]--> ${to}\n`;
    }
    return diagram;
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default OutputFormatter;
