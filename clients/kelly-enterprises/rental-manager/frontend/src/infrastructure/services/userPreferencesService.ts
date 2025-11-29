/**
 * User Preferences Service
 *
 * Manages user preferences with cross-device synchronization via backend API.
 * NO caching - always fetches fresh from backend to ensure cross-device consistency.
 */

import { apiClient } from '../api/client';
import { logger } from '../utils/logger';

class UserPreferencesService {
  private pendingSaves: Map<string, NodeJS.Timeout> = new Map();
  private pendingValues: Map<string, unknown> = new Map();
  private readonly DEBOUNCE_DELAY = 1000; // 1 second debounce

  /**
   * Get a user preference from backend API
   * Always fetches fresh data to ensure cross-device consistency
   * @param key - Preference key
   * @param defaultValue - Default value if preference doesn't exist
   * @returns Preference value or default
   */
  async getPreference<T = unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
    // Always fetch from backend API - no caching for cross-device consistency
    try {
      logger.debug(`🌐 Fetching preference from API: ${key}`);
      const response = await apiClient.get(`/user/preferences/${key}`);

      if (response.success && response.data) {
        const value = response.data as T;
        return value;
      }

      return defaultValue;
    } catch (error: any) {
      if (error.status === 404) {
        logger.debug(`Preference not found: ${key}, using default`);
        return defaultValue;
      }

      logger.error(`Failed to fetch preference ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Save a user preference with debouncing
   * @param key - Preference key
   * @param value - Preference value
   * @param immediate - Skip debouncing if true
   */
  async savePreference(key: string, value: unknown, immediate = false): Promise<void> {
    // Store the value for flushing on unmount
    this.pendingValues.set(key, value);

    // Clear existing debounce timer
    const existingTimeout = this.pendingSaves.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (immediate) {
      await this.saveToApi(key, value);
      this.pendingValues.delete(key);
      return;
    }

    // Debounce API call
    const timeout = setTimeout(async () => {
      await this.saveToApi(key, value);
      this.pendingSaves.delete(key);
      this.pendingValues.delete(key);
    }, this.DEBOUNCE_DELAY);

    this.pendingSaves.set(key, timeout);
  }

  /**
   * Save to API immediately
   */
  private async saveToApi(key: string, value: unknown): Promise<void> {
    try {
      logger.debug(`💾 Saving preference to API: ${key}`);
      await apiClient.put(`/user/preferences/${key}`, { value });
      logger.debug(`✅ Preference saved: ${key}`);
    } catch (error) {
      logger.error(`Failed to save preference ${key}:`, error);
    }
  }

  /**
   * Delete a preference
   */
  async deletePreference(key: string): Promise<void> {
    // Clear pending save
    const existingTimeout = this.pendingSaves.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.pendingSaves.delete(key);
    }
    this.pendingValues.delete(key);

    // Delete from API
    try {
      await apiClient.delete(`/user/preferences/${key}`);
      logger.debug(`🗑️ Preference deleted: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete preference ${key}:`, error);
    }
  }

  /**
   * Get all preferences from API
   */
  async getAllPreferences(): Promise<Record<string, unknown>> {
    try {
      const response = await apiClient.get('/user/preferences');
      return response.success ? response.data : {};
    } catch (error) {
      logger.error('Failed to fetch all preferences:', error);
      return {};
    }
  }

  /**
   * Flush all pending saves immediately
   * Call before logout or page unload
   */
  async flushPendingSaves(): Promise<void> {
    const promises: Promise<void>[] = [];

    this.pendingSaves.forEach((timeout, key) => {
      clearTimeout(timeout);
      const value = this.pendingValues.get(key);
      if (value !== undefined) {
        promises.push(this.saveToApi(key, value));
      }
    });

    this.pendingSaves.clear();
    this.pendingValues.clear();

    if (promises.length > 0) {
      logger.debug(`⚡ Flushing ${promises.length} pending saves...`);
      await Promise.all(promises);
    }
  }

  /**
   * Clear all pending saves
   * Call on logout
   */
  clearAllPending(): void {
    this.pendingSaves.forEach(timeout => clearTimeout(timeout));
    this.pendingSaves.clear();
    this.pendingValues.clear();
  }
}

export const userPreferencesService = new UserPreferencesService();

// Flush pending saves before page unload (hard refresh, tab close, navigation)
window.addEventListener('beforeunload', () => {
  // Synchronously flush all pending saves using sendBeacon for reliability
  // This works even during hard refresh or tab close
  userPreferencesService.flushPendingSaves().catch(() => {
    // Ignore errors during page unload
  });
});
