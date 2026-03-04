/**
 * SnapshotManager - Manages test snapshots for regression testing
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { Signal, SnapshotData, SnapshotDiff } from '../types';

export class SnapshotManager {
  private readonly SNAPSHOT_VERSION = '1.0.0';

  /**
   * Create a snapshot from execution data
   */
  createSnapshot(
    cartridgeName: string,
    signals: Signal[],
    nodeStates: Record<string, unknown>,
    configData: string
  ): SnapshotData {
    return {
      cartridgeName,
      timestamp: new Date().toISOString(),
      version: this.SNAPSHOT_VERSION,
      signals: signals.map(s => ({
        ...s,
        timestamp: s.timestamp instanceof Date 
          ? s.timestamp.toISOString() 
          : s.timestamp
      })) as unknown as Signal[],
      nodeStates: JSON.parse(JSON.stringify(nodeStates)),
      configHash: this.hashConfig(configData)
    };
  }

  /**
   * Save snapshot to file
   */
  saveSnapshot(snapshot: SnapshotData, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  }

  /**
   * Load snapshot from file
   */
  loadSnapshot(filePath: string): SnapshotData | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as SnapshotData;
  }

  /**
   * Check if snapshot exists
   */
  snapshotExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Compare two snapshots and return differences
   */
  compareSnapshots(
    current: SnapshotData,
    baseline: SnapshotData
  ): SnapshotDiff[] {
    const differences: SnapshotDiff[] = [];

    const currentSignals = current.signals;
    const baselineSignals = baseline.signals;

    // Check for signal count differences
    if (currentSignals.length !== baselineSignals.length) {
      differences.push({
        type: 'signal_changed',
        description: `Signal count changed from ${baselineSignals.length} to ${currentSignals.length}`,
        path: 'signals.length',
        expected: baselineSignals.length,
        actual: currentSignals.length
      });
    }

    // Compare each signal
    const maxSignals = Math.max(currentSignals.length, baselineSignals.length);
    for (let i = 0; i < maxSignals; i++) {
      const currentSignal = currentSignals[i];
      const baselineSignal = baselineSignals[i];

      if (!baselineSignal && currentSignal) {
        differences.push({
          type: 'signal_added',
          description: `Signal ${i} was added`,
          path: `signals[${i}]`,
          actual: currentSignal.type
        });
      } else if (baselineSignal && !currentSignal) {
        differences.push({
          type: 'signal_removed',
          description: `Signal ${i} was removed`,
          path: `signals[${i}]`,
          expected: baselineSignal.type
        });
      } else if (currentSignal && baselineSignal) {
        if (currentSignal.type !== baselineSignal.type) {
          differences.push({
            type: 'signal_changed',
            description: `Signal ${i} type changed`,
            path: `signals[${i}].type`,
            expected: baselineSignal.type,
            actual: currentSignal.type
          });
        }

        if (JSON.stringify(currentSignal.payload) !== JSON.stringify(baselineSignal.payload)) {
          differences.push({
            type: 'signal_changed',
            description: `Signal ${i} payload changed`,
            path: `signals[${i}].payload`,
            expected: baselineSignal.payload,
            actual: currentSignal.payload
          });
        }
      }
    }

    // Compare node states
    const currentKeys = Object.keys(current.nodeStates);
    const baselineKeys = Object.keys(baseline.nodeStates);

    const addedNodes = currentKeys.filter(k => !baselineKeys.includes(k));
    const removedNodes = baselineKeys.filter(k => !currentKeys.includes(k));

    for (const node of addedNodes) {
      differences.push({
        type: 'state_changed',
        description: `Node ${node} was added`,
        path: `nodeStates.${node}`,
        actual: current.nodeStates[node]
      });
    }

    for (const node of removedNodes) {
      differences.push({
        type: 'state_changed',
        description: `Node ${node} was removed`,
        path: `nodeStates.${node}`,
        expected: baseline.nodeStates[node]
      });
    }

    for (const key of currentKeys.filter(k => baselineKeys.includes(k))) {
      const currentState = JSON.stringify(current.nodeStates[key]);
      const baselineState = JSON.stringify(baseline.nodeStates[key]);

      if (currentState !== baselineState) {
        differences.push({
          type: 'state_changed',
          description: `Node ${key} state changed`,
          path: `nodeStates.${key}`,
          expected: baseline.nodeStates[key],
          actual: current.nodeStates[key]
        });
      }
    }

    // Compare config hash
    if (current.configHash !== baseline.configHash) {
      differences.push({
        type: 'state_changed',
        description: 'Configuration hash changed',
        path: 'configHash',
        expected: baseline.configHash,
        actual: current.configHash
      });
    }

    return differences;
  }

  /**
   * Hash configuration data
   */
  private hashConfig(configData: string): string {
    return crypto.createHash('md5').update(configData).digest('hex');
  }
}
