/**
 * Replit DB Adapter
 * 
 * Handles key-value operations with proper logging, debugging, and error handling
 * for the Replit Database which has no SQL, joins, or transactions.
 */

interface ReplitDBClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

// In actual implementation, this would be the real Replit DB client
// For now, we'll use a mock that stores in memory
class MockReplitDB implements ReplitDBClient {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.data.keys());
    return prefix ? keys.filter(key => key.startsWith(prefix)) : keys;
  }
}

export class ReplitDBAdapter {
  private client: ReplitDBClient;
  private logger: (message: string, data?: any) => void;

  constructor(client?: ReplitDBClient, logger?: (message: string, data?: any) => void) {
    this.client = client || new MockReplitDB();
    this.logger = logger || ((msg, data) => console.log(`[DB] ${msg}`, data || ''));
  }

  /**
   * Get a single record by key
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = Date.now();
    try {
      this.logger(`GET ${key}`);
      const value = await this.client.get(key);
      const elapsed = Date.now() - startTime;
      
      if (value === null) {
        this.logger(`GET ${key} -> NOT_FOUND (${elapsed}ms)`);
        return null;
      }
      
      const parsed = JSON.parse(value) as T;
      this.logger(`GET ${key} -> SUCCESS (${elapsed}ms)`);
      return parsed;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger(`GET ${key} -> ERROR (${elapsed}ms)`, error);
      throw new Error(`DB GET failed for key: ${key} - ${error}`);
    }
  }

  /**
   * Set a single record
   */
  async set<T>(key: string, value: T): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger(`SET ${key}`);
      await this.client.set(key, JSON.stringify(value));
      const elapsed = Date.now() - startTime;
      this.logger(`SET ${key} -> SUCCESS (${elapsed}ms)`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger(`SET ${key} -> ERROR (${elapsed}ms)`, error);
      throw new Error(`DB SET failed for key: ${key} - ${error}`);
    }
  }

  /**
   * Delete a single record
   */
  async delete(key: string): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger(`DELETE ${key}`);
      await this.client.delete(key);
      const elapsed = Date.now() - startTime;
      this.logger(`DELETE ${key} -> SUCCESS (${elapsed}ms)`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger(`DELETE ${key} -> ERROR (${elapsed}ms)`, error);
      throw new Error(`DB DELETE failed for key: ${key} - ${error}`);
    }
  }

  /**
   * Get multiple records by keys
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        results.set(key, value);
      }
    }
    
    return results;
  }

  /**
   * List keys with optional prefix
   */
  async listKeys(prefix?: string): Promise<string[]> {
    const startTime = Date.now();
    try {
      this.logger(`LIST_KEYS ${prefix || 'ALL'}`);
      const keys = await this.client.list(prefix);
      const elapsed = Date.now() - startTime;
      this.logger(`LIST_KEYS ${prefix || 'ALL'} -> ${keys.length} keys (${elapsed}ms)`);
      return keys;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger(`LIST_KEYS ${prefix || 'ALL'} -> ERROR (${elapsed}ms)`, error);
      throw new Error(`DB LIST_KEYS failed - ${error}`);
    }
  }

  /**
   * Get an index (array of IDs)
   */
  async getIndex(indexKey: string): Promise<string[]> {
    const index = await this.get<string[]>(indexKey);
    return index || [];
  }

  /**
   * Add ID to an index
   */
  async addToIndex(indexKey: string, id: string): Promise<void> {
    const index = await this.getIndex(indexKey);
    if (!index.includes(id)) {
      index.push(id);
      await this.set(indexKey, index);
      this.logger(`Added ${id} to index ${indexKey}`);
    }
  }

  /**
   * Remove ID from an index
   */
  async removeFromIndex(indexKey: string, id: string): Promise<void> {
    const index = await this.getIndex(indexKey);
    const newIndex = index.filter(item => item !== id);
    if (newIndex.length !== index.length) {
      await this.set(indexKey, newIndex);
      this.logger(`Removed ${id} from index ${indexKey}`);
    }
  }

  /**
   * Move ID between indexes (atomic-like operation)
   */
  async moveIndexEntry(fromIndexKey: string, toIndexKey: string, id: string): Promise<void> {
    try {
      await this.removeFromIndex(fromIndexKey, id);
      await this.addToIndex(toIndexKey, id);
      this.logger(`Moved ${id} from ${fromIndexKey} to ${toIndexKey}`);
    } catch (error) {
      this.logger(`Failed to move ${id} between indexes`, error);
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  async audit(operation: string, data: any): Promise<void> {
    const timestamp = new Date().toISOString();
    const id = crypto.randomUUID();
    const auditKey = `audit:${timestamp}:${id}`;
    
    const auditEntry = {
      operation,
      timestamp,
      data,
      id
    };
    
    await this.set(auditKey, auditEntry);
    this.logger(`AUDIT ${operation}`, auditEntry);
  }

  /**
   * Generate next ID for a sequence
   */
  async nextId(sequence: string): Promise<string> {
    const counterKey = `counter:${sequence}`;
    const current = await this.get<number>(counterKey) || 0;
    const next = current + 1;
    await this.set(counterKey, next);
    return next.toString();
  }

  /**
   * Debug endpoint - list keys by prefix (admin only)
   */
  async debugKeys(prefix: string, limit: number = 100): Promise<{keys: string[], total: number}> {
    const allKeys = await this.listKeys(prefix);
    return {
      keys: allKeys.slice(0, limit),
      total: allKeys.length
    };
  }
}