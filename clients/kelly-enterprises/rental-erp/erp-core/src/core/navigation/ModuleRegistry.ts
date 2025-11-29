import React from 'react'
import { Module, Route, NavigationItem } from './types.js'

/**
 * Core module registry for managing dynamic modules and their navigation
 * Extracted from Fireproof Gauge System
 */
class ModuleRegistry {
  private modules: Map<string, Module> = new Map()
  private loadedModules: Set<string> = new Set()
  private listeners: Set<(event: 'register' | 'unregister', moduleId: string) => void> = new Set()

  /**
   * Register a new module
   */
  register(module: Module): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module ${module.id} is already registered`)
      return
    }
    
    // Validate dependencies
    if (module.dependencies) {
      const missingDeps = module.dependencies.filter(dep => !this.modules.has(dep))
      if (missingDeps.length > 0) {
        console.error(`Module ${module.id} has missing dependencies: ${missingDeps.join(', ')}`)
        throw new Error(`Missing dependencies for module ${module.id}`)
      }
    }
    
    this.modules.set(module.id, module)
    this.notifyListeners('register', module.id)
  }

  /**
   * Unregister a module
   */
  unregister(moduleId: string): void {
    const module = this.modules.get(moduleId)
    if (!module) {
      console.warn(`Module ${moduleId} not found`)
      return
    }
    
    // Check if other modules depend on this one
    const dependents = Array.from(this.modules.values()).filter(
      m => m.dependencies?.includes(moduleId)
    )
    
    if (dependents.length > 0) {
      console.error(`Cannot unregister ${moduleId}: Required by ${dependents.map(m => m.id).join(', ')}`)
      throw new Error(`Module ${moduleId} has dependents`)
    }
    
    // Unload if loaded
    if (this.loadedModules.has(moduleId)) {
      this.unloadModule(moduleId)
    }
    
    this.modules.delete(moduleId)
    this.notifyListeners('unregister', moduleId)
  }

  /**
   * Get all routes from registered modules
   */
  getRoutes(): Route[] {
    const routes: Route[] = []
    
    this.modules.forEach((module) => {
      routes.push(...module.routes)
    })
    
    return routes
  }

  /**
   * Get all navigation items from registered modules
   */
  getNavigation(): NavigationItem[] {
    const navigation: NavigationItem[] = []
    
    this.modules.forEach((module) => {
      if (module.navigation) {
        navigation.push(...module.navigation)
      }
    })
    
    return navigation
  }

  /**
   * Get a specific module
   */
  getModule(moduleId: string): Module | undefined {
    return this.modules.get(moduleId)
  }

  /**
   * Get all registered modules
   */
  getAllModules(): Module[] {
    return Array.from(this.modules.values())
  }

  /**
   * Check if a module is registered
   */
  hasModule(moduleId: string): boolean {
    return this.modules.has(moduleId)
  }

  /**
   * Load a specific module by ID
   */
  async loadModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId)
    
    if (!module) {
      throw new Error(`Module ${moduleId} not found`)
    }
    
    if (this.loadedModules.has(moduleId)) {
      console.warn(`Module ${moduleId} is already loaded`)
      return
    }
    
    // Check and load dependencies first
    if (module.dependencies) {
      for (const depId of module.dependencies) {
        if (!this.loadedModules.has(depId)) {
          await this.loadModule(depId)
        }
      }
    }
    
    // Call onLoad if defined
    if (module.onLoad) {
      await module.onLoad()
    }
    
    this.loadedModules.add(moduleId)
  }

  /**
   * Unload a specific module
   */
  async unloadModule(moduleId: string): Promise<void> {
    const module = this.modules.get(moduleId)
    
    if (!module) {
      throw new Error(`Module ${moduleId} not found`)
    }
    
    if (!this.loadedModules.has(moduleId)) {
      console.warn(`Module ${moduleId} is not loaded`)
      return
    }
    
    // Check if other loaded modules depend on this one
    const loadedDependents = Array.from(this.modules.values()).filter(
      m => this.loadedModules.has(m.id) && m.dependencies?.includes(moduleId)
    )
    
    if (loadedDependents.length > 0) {
      console.error(`Cannot unload ${moduleId}: Required by loaded modules ${loadedDependents.map(m => m.id).join(', ')}`)
      throw new Error(`Module ${moduleId} has loaded dependents`)
    }
    
    // Call onUnload if defined
    if (module.onUnload) {
      await module.onUnload()
    }
    
    this.loadedModules.delete(moduleId)
  }

  /**
   * Subscribe to module registry events
   */
  subscribe(listener: (event: 'register' | 'unregister', moduleId: string) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(event: 'register' | 'unregister', moduleId: string): void {
    this.listeners.forEach(listener => listener(event, moduleId))
  }

  /**
   * Clear all modules (useful for testing)
   */
  clear(): void {
    // Unload all modules first
    const loadedIds = Array.from(this.loadedModules)
    loadedIds.forEach(id => {
      try {
        this.unloadModule(id)
      } catch (e) {
        console.error(`Failed to unload module ${id}:`, e)
      }
    })
    
    this.modules.clear()
    this.loadedModules.clear()
  }
}

// Export singleton instance
export const moduleRegistry = new ModuleRegistry()

// Also export the class for testing or multiple instances
export { ModuleRegistry }