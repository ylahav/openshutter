import { logger } from '@/lib/utils/logger'

export interface QueryMetrics {
  queryName: string
  executionTime: number
  resultCount: number
  cacheHit: boolean
  timestamp: Date
  error?: string
}

export interface PerformanceThresholds {
  slowQueryThreshold: number // milliseconds
  maxResultCount: number
  cacheHitRateThreshold: number // percentage
}

export class QueryMonitor {
  private static metrics: QueryMetrics[] = []
  private static thresholds: PerformanceThresholds = {
    slowQueryThreshold: 1000, // 1 second
    maxResultCount: 10000,
    cacheHitRateThreshold: 80 // 80%
  }

  /**
   * Start monitoring a query
   */
  static startQuery(queryName: string): (resultCount?: number, cacheHit?: boolean, error?: string) => void {
    const startTime = performance.now()
    
    return (resultCount: number = 0, cacheHit: boolean = false, error?: string) => {
      const executionTime = performance.now() - startTime
      
      const metric: QueryMetrics = {
        queryName,
        executionTime,
        resultCount,
        cacheHit,
        timestamp: new Date(),
        error
      }
      
      this.metrics.push(metric)
      
      // Log slow queries
      if (executionTime > this.thresholds.slowQueryThreshold) {
        logger.warn(`🐌 Slow query detected: ${queryName} took ${executionTime.toFixed(2)}ms`)
      }
      
      // Log large result sets
      if (resultCount > this.thresholds.maxResultCount) {
        logger.warn(`📊 Large result set: ${queryName} returned ${resultCount} results`)
      }
      
      // Log errors
      if (error) {
        logger.error(`❌ Query error: ${queryName} - ${error}`)
      }
    }
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    totalQueries: number
    averageExecutionTime: number
    slowQueries: number
    cacheHitRate: number
    errorRate: number
    topSlowQueries: Array<{ queryName: string; avgTime: number; count: number }>
  } {
    const totalQueries = this.metrics.length
    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueries: 0,
        cacheHitRate: 0,
        errorRate: 0,
        topSlowQueries: []
      }
    }

    const totalExecutionTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0)
    const averageExecutionTime = totalExecutionTime / totalQueries

    const slowQueries = this.metrics.filter(m => m.executionTime > this.thresholds.slowQueryThreshold).length
    const cacheHits = this.metrics.filter(m => m.cacheHit).length
    const cacheHitRate = (cacheHits / totalQueries) * 100

    const errors = this.metrics.filter(m => m.error).length
    const errorRate = (errors / totalQueries) * 100

    // Group by query name and calculate averages
    const queryGroups = this.metrics.reduce((groups, metric) => {
      if (!groups[metric.queryName]) {
        groups[metric.queryName] = []
      }
      groups[metric.queryName].push(metric)
      return groups
    }, {} as Record<string, QueryMetrics[]>)

    const topSlowQueries = Object.entries(queryGroups)
      .map(([queryName, metrics]) => ({
        queryName,
        avgTime: metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length,
        count: metrics.length
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10)

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries,
      cacheHitRate,
      errorRate,
      topSlowQueries
    }
  }

  /**
   * Get query performance report
   */
  static generateReport(): string {
    const stats = this.getPerformanceStats()
    
    if (stats.totalQueries === 0) {
      return '📊 No query metrics available yet.'
    }

    return `
🚀 Database Query Performance Report
====================================

📈 Overall Performance:
  • Total Queries: ${stats.totalQueries.toLocaleString()}
  • Average Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms
  • Slow Queries (>${this.thresholds.slowQueryThreshold}ms): ${stats.slowQueries} (${((stats.slowQueries / stats.totalQueries) * 100).toFixed(1)}%)
  • Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%
  • Error Rate: ${stats.errorRate.toFixed(1)}%

🐌 Top Slow Queries:
${stats.topSlowQueries.map((q, i) => 
  `  ${i + 1}. ${q.queryName}: ${q.avgTime.toFixed(2)}ms (${q.count} calls)`
).join('\n')}

🎯 Performance Score: ${this.calculatePerformanceScore(stats)}/100
    `.trim()
  }

  /**
   * Calculate overall performance score
   */
  private static calculatePerformanceScore(stats: any): number {
    let score = 100

    // Deduct points for slow average execution time
    if (stats.averageExecutionTime > 2000) score -= 30
    else if (stats.averageExecutionTime > 1000) score -= 20
    else if (stats.averageExecutionTime > 500) score -= 10

    // Deduct points for high slow query percentage
    const slowQueryPercentage = (stats.slowQueries / stats.totalQueries) * 100
    if (slowQueryPercentage > 20) score -= 25
    else if (slowQueryPercentage > 10) score -= 15
    else if (slowQueryPercentage > 5) score -= 10

    // Deduct points for low cache hit rate
    if (stats.cacheHitRate < 50) score -= 20
    else if (stats.cacheHitRate < 70) score -= 10
    else if (stats.cacheHitRate < 90) score -= 5

    // Deduct points for high error rate
    if (stats.errorRate > 10) score -= 30
    else if (stats.errorRate > 5) score -= 20
    else if (stats.errorRate > 1) score -= 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Clear metrics history
   */
  static clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Update performance thresholds
   */
  static updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
  }

  /**
   * Get metrics for a specific query
   */
  static getQueryMetrics(queryName: string): QueryMetrics[] {
    return this.metrics.filter(m => m.queryName === queryName)
  }

  /**
   * Export metrics for analysis
   */
  static exportMetrics(): QueryMetrics[] {
    return [...this.metrics]
  }
}
