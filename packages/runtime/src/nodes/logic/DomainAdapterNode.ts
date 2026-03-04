/**
 * DomainAdapterNode - Translates domain signals to infrastructure signals
 * 
 * This node bridges the gap between domain logic and infrastructure operations.
 * It takes a domain signal, merges it with configured constants, and applies
 * field mappings to produce an infrastructure-ready signal.
 * 
 * @module @graph-os/runtime
 */

import { BaseNode, Signal, NodeConfig } from '@graph-os/core';

/**
 * Field mapping definition.
 */
interface FieldMapping {
    /** Source field path in the input signal payload */
    from: string;
    /** Target field path in the output signal payload */
    to: string;
    /** Optional transformation (uppercase, lowercase, etc.) */
    transform?: 'uppercase' | 'lowercase' | 'trim' | 'number' | 'string' | 'boolean' | 'json';
}

/**
 * Configuration for DomainAdapterNode.
 */
export interface DomainAdapterConfig extends NodeConfig {
    /** The signal type to emit after adaptation */
    outputSignalType?: string;
    /** Constant values to inject into the output payload (e.g., file paths, operations) */
    constants?: Record<string, unknown>;
    /** Field mappings from input to output payload */
    mappings?: FieldMapping[];
}

/**
 * DomainAdapterNode adapts domain signals for infrastructure nodes.
 */
export class DomainAdapterNode extends BaseNode {
    type = 'logic.domain-adapter';
    private outputSignalType: string;
    private constants: Record<string, unknown>;
    private mappings: FieldMapping[];

    constructor(id: string, config: DomainAdapterConfig) {
        super(id, config);
        this.outputSignalType = config.outputSignalType || '';
        this.constants = config.constants || {};
        this.mappings = config.mappings || [];

        if (!this.outputSignalType) {
            throw new Error(`DomainAdapterNode "${id}" requires outputSignalType in config`);
        }
    }

    async process(signal: Signal): Promise<Signal | null> {
        const inputPayload = signal.payload as Record<string, unknown>;

        // Start with constants as the base for the output payload
        const outputPayload = JSON.parse(JSON.stringify(this.constants));

        // Apply mappings
        for (const mapping of this.mappings) {
            const value = this.getNestedValue(inputPayload, mapping.from);
            if (value !== undefined) {
                const transformedValue = this.applyTransform(value, mapping.transform);
                this.setNestedValue(outputPayload, mapping.to, transformedValue);
            }
        }

        return this.createOutputSignal(this.outputSignalType, outputPayload);
    }

    /**
     * Gets a nested value from an object using dot notation.
     */
    private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
        const parts = path.split('.');
        let current: unknown = obj;

        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }

    /**
     * Sets a nested value in an object using dot notation.
     */
    private setNestedValue(
        obj: Record<string, unknown>,
        path: string,
        value: unknown
    ): void {
        const parts = path.split('.');
        let current: Record<string, unknown> = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
                current[part] = {};
            }
            current = current[part] as Record<string, unknown>;
        }

        current[parts[parts.length - 1]] = value;
    }

    /**
     * Applies a transformation to a value.
     */
    private applyTransform(value: unknown, transform?: string): unknown {
        if (!transform) return value;

        switch (transform) {
            case 'uppercase':
                return typeof value === 'string' ? value.toUpperCase() : value;
            case 'lowercase':
                return typeof value === 'string' ? value.toLowerCase() : value;
            case 'trim':
                return typeof value === 'string' ? value.trim() : value;
            case 'number':
                return typeof value === 'string' ? parseFloat(value) : Number(value);
            case 'string':
                return String(value);
            case 'boolean':
                return Boolean(value);
            case 'json':
                return JSON.stringify(value);
            default:
                return value;
        }
    }
}
