/**
 * CacheManager - Advanced caching system with TTL and LRU eviction
 * 
 * Provides a flexible, type-safe caching system with:
 * - TTL-based expiration
 * - LRU (Least Recently Used) eviction
 * - Multiple backend strategies (memory, localStorage)
 * - Cache statistics and analytics
 * - EventBus integration for cache events
 * - Pattern-based invalidation
 * 
 * @example
 * // Basic usage
 * const cache = new CacheManager({ maxSize: 100, defaultTTL: 60000 });
 * cache.set('user:123', { name: 'John', email: 'john@example.com' });
 * const user = cache.get<User>('user:123');
 * 
 * @example
 * // With localStorage backend
 * const persistentCache = new CacheManager({
 *   strategy: 'localStorage',
 *   namespace: 'erp-cache',
 *   maxSize: 50
 * });
 */

import { eventBus } from './EventBus.js';
import { CACHE_EVENTS, type CacheEventData } from './events.js';

// Cache entry interface
interface CacheEntry<T = any> {
  key: string;
  value: T;
  expires: number;
  lastAccessed: number;
  size: number;
}

// Cache statistics interface
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

// Cache backend strategies
export type CacheStrategy = 'memory' | 'localStorage';

// Cache configuration options
export interface CacheManagerOptions {
  /** Maximum number of entries (default: 1000) */
  maxSize?: number;
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number;
  /** Cache backend strategy (default: 'memory') */
  strategy?: CacheStrategy;
  /** Namespace for localStorage strategy (default: 'cache') */
  namespace?: string;
  /** Enable/disable event emissions (default: true) */
  enableEvents?: boolean;
  /** Enable/disable cache statistics (default: true) */
  enableStats?: boolean;
  /** Custom serializer for complex objects */
  serializer?: {
    serialize: (value: any) => string;
    deserialize: (value: string) => any;
  };
}

// Cache backend interface
interface CacheBackend {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
  keys(): string[];
  size(): number;
}

// Memory backend implementation
class MemoryBackend implements CacheBackend {
  private storage = new Map<string, string>();

  get(key: string): string | null {
    return this.storage.get(key) || null;
  }

  set(key: string, value: string): void {
    this.storage.set(key, value);
  }

  remove(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  keys(): string[] {
    return Array.from(this.storage.keys());
  }

  size(): number {
    return this.storage.size;
  }
}

// LocalStorage backend implementation
class LocalStorageBackend implements CacheBackend {
  constructor(private namespace: string) {}

  private getNamespacedKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  get(key: string): string | null {
    try {
      return localStorage.getItem(this.getNamespacedKey(key));
    } catch (error) {
      console.warn('[CacheManager] localStorage get failed:', error);
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      localStorage.setItem(this.getNamespacedKey(key), value);
    } catch (error) {
      console.warn('[CacheManager] localStorage set failed:', error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.getNamespacedKey(key));
    } catch (error) {
      console.warn('[CacheManager] localStorage remove failed:', error);
    }
  }

  clear(): void {
    try {
      const keys = this.keys();
      keys.forEach(key => this.remove(key.replace(`${this.namespace}:`, '')));
    } catch (error) {
      console.warn('[CacheManager] localStorage clear failed:', error);
    }
  }

  keys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.namespace}:`)) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.warn('[CacheManager] localStorage keys failed:', error);
      return [];
    }
  }

  size(): number {
    return this.keys().length;
  }
}

/**
 * CacheManager - Advanced caching with TTL, LRU, and multiple backends
 */
export class CacheManager<T = any> {
  private backend: CacheBackend;
  private options: Required<CacheManagerOptions>;
  private stats: CacheStats;
  private accessOrder: string[] = []; // For LRU tracking

  constructor(options: CacheManagerOptions = {}) {
    this.options = {
      maxSize: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      strategy: 'memory',
      namespace: 'cache',
      enableEvents: true,
      enableStats: true,
      serializer: {
        serialize: JSON.stringify,
        deserialize: JSON.parse
      },
      ...options
    };

    // Initialize backend
    this.backend = this.createBackend();

    // Initialize stats
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      maxSize: this.options.maxSize,
      hitRate: 0,
      memoryUsage: 0
    };

    // Load existing cache size for stats
    this.updateStatsSize();
  }

  /**
   * Create the appropriate backend based on strategy
   */
  private createBackend(): CacheBackend {
    switch (this.options.strategy) {
      case 'localStorage':
        return new LocalStorageBackend(this.options.namespace);
      case 'memory':
      default:
        return new MemoryBackend();
    }
  }

  /**
   * Get a value from the cache
   */
  get<V = T>(key: string): V | null {
    const entry = this.getEntry<V>(key);
    
    if (entry === null) {
      this.recordMiss(key);
      return null;
    }

    this.recordHit(key, entry);
    this.updateAccessOrder(key);
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set<V = T>(key: string, value: V, ttl?: number): void {
    const expires = Date.now() + (ttl || this.options.defaultTTL);
    const entry: CacheEntry<V> = {
      key,
      value,
      expires,
      lastAccessed: Date.now(),
      size: this.calculateSize(value)
    };

    // Check if we need to evict entries
    if (this.backend.size() >= this.options.maxSize && !this.has(key)) {
      this.evictLRU();
    }

    // Store the entry
    this.setEntry(key, entry);
    this.updateAccessOrder(key);
    this.updateStatsSize();

    if (this.options.enableEvents) {
      eventBus.publish(CACHE_EVENTS.SET, {
        key,
        size: entry.size,
        ttl: ttl || this.options.defaultTTL,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.getEntry(key) !== null;
  }

  /**
   * Remove a specific key from the cache
   */
  delete(key: string): boolean {
    const existed = this.has(key);
    
    if (existed) {
      this.backend.remove(key);
      this.removeFromAccessOrder(key);
      this.updateStatsSize();

      if (this.options.enableEvents) {
        eventBus.publish(CACHE_EVENTS.DELETE, {
          key,
          timestamp: Date.now()
        });
      }
    }

    return existed;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.backend.clear();
    this.accessOrder = [];
    this.stats.size = 0;
    this.stats.memoryUsage = 0;

    if (this.options.enableEvents) {
      eventBus.publish(CACHE_EVENTS.CLEAR, {
        timestamp: Date.now()
      });
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string | RegExp): number {
    const keys = this.keys();
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern.replace(/\*/g, '.*')) 
      : pattern;
    
    let invalidated = 0;
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.delete(key);
        invalidated++;
      }
    });

    if (this.options.enableEvents && invalidated > 0) {
      eventBus.publish(CACHE_EVENTS.INVALIDATE, {
        pattern: pattern.toString(),
        count: invalidated,
        timestamp: Date.now()
      });
    }

    return invalidated;
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return this.backend.keys()
      .map(key => key.replace(`${this.options.namespace}:`, ''))
      .filter(key => this.has(key));
  }

  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.keys().length;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStatsSize();
    
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: this.stats.size,
      maxSize: this.options.maxSize,
      hitRate: 0,
      memoryUsage: this.stats.memoryUsage
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): number {
    const keys = this.backend.keys();
    let cleaned = 0;

    keys.forEach(key => {
      const entry = this.getEntryRaw(key);
      if (entry && this.isExpired(entry)) {
        this.backend.remove(key);
        this.removeFromAccessOrder(key.replace(`${this.options.namespace}:`, ''));
        cleaned++;
      }
    });

    this.updateStatsSize();
    
    if (this.options.enableEvents && cleaned > 0) {
      eventBus.publish(CACHE_EVENTS.CLEANUP, {
        cleaned,
        timestamp: Date.now()
      });
    }

    return cleaned;
  }

  /**
   * Get or set a value (if not present)
   */
  async getOrSet<V = T>(
    key: string, 
    factory: () => V | Promise<V>, 
    ttl?: number
  ): Promise<V> {
    let value = this.get<V>(key);
    
    if (value === null) {
      value = await factory();
      this.set(key, value, ttl);
    }
    
    return value;
  }

  /**
   * Get multiple values by keys
   */
  mget<V = T>(keys: string[]): Map<string, V | null> {
    const result = new Map<string, V | null>();
    
    keys.forEach(key => {
      result.set(key, this.get<V>(key));
    });
    
    return result;
  }

  /**
   * Set multiple values at once
   */
  mset<V = T>(entries: Map<string, V> | Record<string, V>, ttl?: number): void {
    const entryMap = entries instanceof Map ? entries : new Map(Object.entries(entries));
    
    entryMap.forEach((value, key) => {
      this.set(key, value, ttl);
    });
  }

  /**
   * Private: Get cache entry with expiration check
   */
  private getEntry<V = T>(key: string): CacheEntry<V> | null {
    const entry = this.getEntryRaw<V>(key);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.backend.remove(key);
      this.removeFromAccessOrder(key);
      this.updateStatsSize();
      return null;
    }

    return entry;
  }

  /**
   * Private: Get raw entry without expiration check
   */
  private getEntryRaw<V = T>(key: string): CacheEntry<V> | null {
    try {
      const data = this.backend.get(key);
      if (!data) {
        return null;
      }

      return this.options.serializer.deserialize(data) as CacheEntry<V>;
    } catch (error) {
      console.warn('[CacheManager] Failed to deserialize entry:', error);
      this.backend.remove(key);
      return null;
    }
  }

  /**
   * Private: Set cache entry
   */
  private setEntry<V = T>(key: string, entry: CacheEntry<V>): void {
    try {
      const data = this.options.serializer.serialize(entry);
      this.backend.set(key, data);
    } catch (error) {
      console.warn('[CacheManager] Failed to serialize entry:', error);
    }
  }

  /**
   * Private: Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expires;
  }

  /**
   * Private: Calculate approximate size of a value
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length;
    } catch {
      return 1; // Fallback size
    }
  }

  /**
   * Private: Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Private: Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Private: Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    this.backend.remove(lruKey);
    this.removeFromAccessOrder(lruKey);
    this.stats.evictions++;
    this.updateStatsSize();

    if (this.options.enableEvents) {
      eventBus.publish(CACHE_EVENTS.EVICT, {
        key: lruKey,
        reason: 'lru',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Private: Record cache hit
   */
  private recordHit<V = T>(key: string, entry: CacheEntry<V>): void {
    if (!this.options.enableStats) return;

    this.stats.hits++;
    entry.lastAccessed = Date.now();

    if (this.options.enableEvents) {
      eventBus.publish(CACHE_EVENTS.HIT, {
        key,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Private: Record cache miss
   */
  private recordMiss(key: string): void {
    if (!this.options.enableStats) return;

    this.stats.misses++;

    if (this.options.enableEvents) {
      eventBus.publish(CACHE_EVENTS.MISS, {
        key,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Private: Update stats size and memory usage
   */
  private updateStatsSize(): void {
    if (!this.options.enableStats) return;

    this.stats.size = this.backend.size();
    
    // Approximate memory usage calculation
    let memoryUsage = 0;
    const keys = this.backend.keys();
    
    keys.forEach(key => {
      const entry = this.getEntryRaw(key);
      if (entry) {
        memoryUsage += entry.size;
      }
    });
    
    this.stats.memoryUsage = memoryUsage;
  }
}

// Create default cache manager instance
export const cacheManager = new CacheManager();

// Convenience functions using default instance
export const get = <T = any>(key: string): T | null => cacheManager.get<T>(key);
export const set = <T = any>(key: string, value: T, ttl?: number): void => cacheManager.set(key, value, ttl);
export const has = (key: string): boolean => cacheManager.has(key);
export const del = (key: string): boolean => cacheManager.delete(key);
export const clear = (): void => cacheManager.clear();
export const invalidate = (pattern: string | RegExp): number => cacheManager.invalidate(pattern);
export const getStats = (): CacheStats => cacheManager.getStats();
export const cleanup = (): number => cacheManager.cleanup();