import { Signal } from '@graph-os/core';

/**
 * Entry in the Dead Letter Queue.
 */
export interface DLQEntry {
    /** The original signal that failed */
    signal: Signal;
    /** The ID of the node that failed to process the signal */
    targetNodeId: string;
    /** The error that occurred */
    error: any;
    /** When the failure occurred */
    timestamp: Date;
    /** How many times this signal has been retried (for future use) */
    retryCount: number;
}
