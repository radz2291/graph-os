/**
 * FileWatcher - Monitors cartridge files for changes
 * 
 * Provides hot-reload capability during development by watching
 * for file changes and triggering callbacks.
 * 
 * @module @graph-os/runtime
 */

// Dynamic imports for fs will be used inside methods
import type { FSWatcher } from 'fs';

export interface WatchOptions {
  /** Paths to watch */
  paths: string[];

  /** Callback when file changes */
  onChange: (filePath: string) => void | Promise<void>;

  /** Debounce delay in ms (default: 200) */
  debounce?: number;

  /** File patterns to ignore (e.g., node_modules, .git) */
  ignorePatterns?: RegExp[];
}

export class FileWatcher {
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private options: Required<WatchOptions>;
  private isWatching: boolean = false;

  constructor(options: WatchOptions) {
    this.options = {
      debounce: 200,
      ignorePatterns: [
        /node_modules/,
        /\.git/,
        /\.DS_Store/,
        /dist/,
        /build/,
      ],
      ...options
    };
  }

  /**
   * Starts watching the specified paths.
   */
  async start(): Promise<void> {
    if (this.isWatching) {
      return;
    }

    this.isWatching = true;

    for (const watchPath of this.options.paths) {
      try {
        const fsPromises = await import('fs/promises');
        const fs = await import('fs');

        // Check if path exists
        try {
          await fsPromises.access(watchPath);
        } catch {
          console.warn(`[FileWatcher] Path does not exist: ${watchPath}`);
          continue;
        }

        const watcher = fs.watch(watchPath, { persistent: true }, async (eventType, filename) => {
          if (eventType === 'change' && filename) {
            const filePath = watchPath.endsWith('/')
              ? watchPath + filename
              : watchPath;

            // Check if file should be ignored
            if (this.shouldIgnore(filePath)) {
              return;
            }

            // Debounce rapid changes
            this.debounce(filePath, async () => {
              try {
                await this.options.onChange(filePath);
              } catch (error) {
                console.error(`[FileWatcher] Error in onChange callback:`, error);
              }
            });
          }
        });

        this.watchers.set(watchPath, watcher);
      } catch (error) {
        console.error(`[FileWatcher] Failed to watch ${watchPath}:`, error);
      }
    }

    if (this.watchers.size > 0) {
      console.log(`[FileWatcher] Watching ${this.watchers.size} path(s)`);
    }
  }

  /**
   * Stops all file watchers.
   */
  async stop(): Promise<void> {
    if (!this.isWatching) {
      return;
    }

    this.isWatching = false;

    // Close all watchers
    for (const [path, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        console.error(`[FileWatcher] Error closing watcher for ${path}:`, error);
      }
    }

    this.watchers.clear();

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }

    this.debounceTimers.clear();
  }

  /**
   * Checks if a file should be ignored.
   */
  private shouldIgnore(filePath: string): boolean {
    for (const pattern of this.options.ignorePatterns) {
      if (pattern.test(filePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Debounces rapid file changes.
   */
  private debounce(key: string, fn: () => void): void {
    const existing = this.debounceTimers.get(key);

    if (existing) {
      clearTimeout(existing);
    }

    this.debounceTimers.set(key, setTimeout(() => {
      fn();
      this.debounceTimers.delete(key);
    }, this.options.debounce));
  }

  /**
   * Checks if watcher is currently active.
   */
  isActive(): boolean {
    return this.isWatching && this.watchers.size > 0;
  }

  /**
   * Gets the number of active watchers.
   */
  getWatcherCount(): number {
    return this.watchers.size;
  }
}
