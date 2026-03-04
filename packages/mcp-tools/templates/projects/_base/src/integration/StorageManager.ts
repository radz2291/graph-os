export class StorageManager<T extends { id: string }> {
    private key: string;

    constructor(key: string) {
        this.key = key;
    }

    // Load from localStorage
    load(): T[] {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data) : [];
        } catch (err) {
            console.error(`Failed to load ${this.key} from localStorage:`, err);
            return [];
        }
    }

    // Save to localStorage
    save(items: T[]): void {
        try {
            localStorage.setItem(this.key, JSON.stringify(items));
        } catch (err) {
            console.error(`Failed to save ${this.key} to localStorage:`, err);
        }
    }

    // Add item
    add(item: T): void {
        const current = this.load();
        this.save([...current, item]);
    }

    // Update item
    update(id: string, updates: Partial<T>): void {
        const current = this.load();
        this.save(current.map(item =>
            item.id === id ? { ...item, ...updates } : item
        ));
    }

    // Delete item
    delete(id: string): void {
        const current = this.load();
        this.save(current.filter(item => item.id !== id));
    }
}
