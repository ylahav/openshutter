export interface CacheConfig {
  maxAge?: number
  sMaxAge?: number
  staleWhileRevalidate?: number
  mustRevalidate?: boolean
  noCache?: boolean
  noStore?: boolean
  private?: boolean
  public?: boolean
}

export class CacheManager {
  // Cache configurations for different content types
  private static readonly CACHE_CONFIGS: Record<string, CacheConfig> = {
    // Static images - cache for 1 year
    images: {
      maxAge: 31536000, // 1 year
      sMaxAge: 31536000,
      staleWhileRevalidate: 86400, // 1 day
      public: true
    },
    
    // Thumbnails - cache for 6 months
    thumbnails: {
      maxAge: 15552000, // 6 months
      sMaxAge: 15552000,
      staleWhileRevalidate: 86400, // 1 day
      public: true
    },
    
    // API responses - cache for 5 minutes
    api: {
      maxAge: 300, // 5 minutes
      sMaxAge: 300,
      staleWhileRevalidate: 60, // 1 minute
      public: true
    },
    
    // Album data - cache for 1 hour
    albums: {
      maxAge: 3600, // 1 hour
      sMaxAge: 3600,
      staleWhileRevalidate: 300, // 5 minutes
      public: true
    },
    
    // Photo metadata - cache for 30 minutes
    photos: {
      maxAge: 1800, // 30 minutes
      sMaxAge: 1800,
      staleWhileRevalidate: 300, // 5 minutes
      public: true
    },
    
    // Site configuration - cache for 1 hour
    config: {
      maxAge: 3600, // 1 hour
      sMaxAge: 3600,
      staleWhileRevalidate: 300, // 5 minutes
      public: true
    },
    
    // HTML pages - cache for 5 minutes
    pages: {
      maxAge: 300, // 5 minutes
      sMaxAge: 300,
      staleWhileRevalidate: 60, // 1 minute
      public: true
    },
    
    // No cache for sensitive data
    sensitive: {
      noCache: true,
      noStore: true,
      private: true
    }
  }

  /**
   * Generate cache headers for a given content type
   */
  static getCacheHeaders(contentType: string): Record<string, string> {
    const config = this.CACHE_CONFIGS[contentType] || this.CACHE_CONFIGS.api
    
    if (config.noCache || config.noStore) {
      return {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }

    const cacheControl: string[] = []
    
    if (config.public) {
      cacheControl.push('public')
    } else if (config.private) {
      cacheControl.push('private')
    }
    
    if (config.maxAge !== undefined) {
      cacheControl.push(`max-age=${config.maxAge}`)
    }
    
    if (config.sMaxAge) {
      cacheControl.push(`s-maxage=${config.sMaxAge}`)
    }
    
    if (config.staleWhileRevalidate) {
      cacheControl.push(`stale-while-revalidate=${config.staleWhileRevalidate}`)
    }
    
    if (config.mustRevalidate) {
      cacheControl.push('must-revalidate')
    }

    const headers: Record<string, string> = {
      'Cache-Control': cacheControl.join(', ')
    }

    // Add ETag for better caching
    if (contentType !== 'sensitive') {
      headers['ETag'] = `"${Date.now()}"`
    }

    return headers
  }

  /**
   * Apply cache headers to a Response (SvelteKit compatible)
   */
  static applyCacheHeaders(
    response: Response,
    contentType: string,
    customHeaders?: Record<string, string>
  ): Response {
    const cacheHeaders = this.getCacheHeaders(contentType)
    
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }
    
    return response
  }

  /**
   * Check if a request should be served from cache
   */
  static shouldServeFromCache(request: Request, contentType: string): boolean {
    const config = this.CACHE_CONFIGS[contentType] || this.CACHE_CONFIGS.api
    
    if (config.noCache || config.noStore) {
      return false
    }

    // Check if client has a valid cached version
    const ifNoneMatch = request.headers.get('if-none-match')
    const ifModifiedSince = request.headers.get('if-modified-since')
    
    return !!(ifNoneMatch || ifModifiedSince)
  }

  /**
   * Generate a cache key for a given resource
   */
  static generateCacheKey(
    resourceType: string,
    identifier: string,
    params?: Record<string, any>
  ): string {
    const baseKey = `${resourceType}:${identifier}`
    
    if (params) {
      const paramString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')
      return `${baseKey}:${paramString}`
    }
    
    return baseKey
  }

  /**
   * Get cache configuration for a specific content type
   */
  static getCacheConfig(contentType: string): CacheConfig {
    return this.CACHE_CONFIGS[contentType] || this.CACHE_CONFIGS.api
  }

  /**
   * Check if content should be revalidated
   */
  static shouldRevalidate(
    lastModified: Date,
    contentType: string
  ): boolean {
    const config = this.getCacheConfig(contentType)
    
    // If no cache or no maxAge, always revalidate
    if (config.noCache || config.noStore || config.maxAge === undefined) {
      return true
    }
    
    const now = new Date()
    const age = now.getTime() - lastModified.getTime()
    
    return age > (config.maxAge * 1000)
  }
}
