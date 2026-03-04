import * as path from 'path';

export class SessionState {
    private static instance: SessionState;
    private projectRoot: string | null = null;

    private constructor() { }

    static getInstance(): SessionState {
        if (!SessionState.instance) {
            SessionState.instance = new SessionState();
        }
        return SessionState.instance;
    }

    setContext(rootPath: string): void {
        this.projectRoot = path.resolve(rootPath);
    }

    getContext(): string | null {
        return this.projectRoot;
    }

    resolvePath(relativePath: string): string {
        if (!this.projectRoot) return relativePath; // No context set, return as is
        if (path.isAbsolute(relativePath)) return relativePath; // Already absolute
        return path.resolve(this.projectRoot, relativePath);
    }

    isActive(): boolean {
        return this.projectRoot !== null;
    }
}
