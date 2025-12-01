"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitor = void 0;
class PerformanceMonitor {
    /**
     * Track page load performance
     */
    static trackPageLoad(startTime) {
        const loadTime = performance.now() - startTime;
        this.metrics.pageLoadTime = loadTime;
        // Send to analytics if available
        if (typeof window !== 'undefined' && 'gtag' in window) {
            window.gtag('event', 'page_load_time', {
                value: Math.round(loadTime),
                custom_parameter: 'openshutter'
            });
        }
    }
    /**
     * Track image load performance
     */
    static trackImageLoad(imageUrl, startTime, size, format, cached = false) {
        const loadTime = performance.now() - startTime;
        const imageMetric = {
            imageUrl,
            loadTime,
            size,
            format,
            cached
        };
        this.imageMetrics.push(imageMetric);
        // Update average image load time
        const totalLoadTime = this.imageMetrics.reduce((sum, metric) => sum + metric.loadTime, 0);
        this.metrics.imageLoadTime = totalLoadTime / this.imageMetrics.length;
        // Update cache hit rate
        const cachedImages = this.imageMetrics.filter(metric => metric.cached).length;
        this.metrics.cacheHitRate = (cachedImages / this.imageMetrics.length) * 100;
    }
    /**
     * Track API response time
     */
    static trackApiResponse(endpoint, startTime) {
        const responseTime = performance.now() - startTime;
        this.metrics.apiResponseTime = responseTime;
        console.log(`API ${endpoint} responded in ${responseTime.toFixed(2)}ms`);
    }
    /**
     * Track compression performance
     */
    static trackCompression(originalSize, compressedSize) {
        const compressionRatio = compressedSize / originalSize;
        const bandwidthSaved = originalSize - compressedSize;
        this.metrics.compressionRatio = compressionRatio;
        this.metrics.bandwidthSaved += bandwidthSaved;
        console.log(`Image compressed: ${originalSize} → ${compressedSize} bytes (${((1 - compressionRatio) * 100).toFixed(1)}% reduction)`);
    }
    /**
     * Get current performance metrics
     */
    static getMetrics() {
        return Object.assign({}, this.metrics);
    }
    /**
     * Get image load metrics
     */
    static getImageMetrics() {
        return [...this.imageMetrics];
    }
    /**
     * Reset metrics
     */
    static resetMetrics() {
        this.metrics = {
            pageLoadTime: 0,
            imageLoadTime: 0,
            apiResponseTime: 0,
            cacheHitRate: 0,
            compressionRatio: 0,
            bandwidthSaved: 0
        };
        this.imageMetrics = [];
    }
    /**
     * Generate performance report
     */
    static generateReport() {
        const { pageLoadTime, imageLoadTime, apiResponseTime, cacheHitRate, compressionRatio, bandwidthSaved } = this.metrics;
        return `
🚀 OpenShutter Performance Report
================================

📊 Page Performance:
  • Page Load Time: ${pageLoadTime.toFixed(2)}ms
  • Average Image Load: ${imageLoadTime.toFixed(2)}ms
  • API Response Time: ${apiResponseTime.toFixed(2)}ms

💾 Caching Performance:
  • Cache Hit Rate: ${cacheHitRate.toFixed(1)}%
  • Images Loaded: ${this.imageMetrics.length}

🗜️ Compression Performance:
  • Average Compression Ratio: ${(compressionRatio * 100).toFixed(1)}%
  • Total Bandwidth Saved: ${(bandwidthSaved / 1024 / 1024).toFixed(2)}MB

🎯 Performance Score: ${this.calculatePerformanceScore()}/100
    `.trim();
    }
    /**
     * Calculate overall performance score
     */
    static calculatePerformanceScore() {
        let score = 100;
        // Deduct points for slow page loads
        if (this.metrics.pageLoadTime > 3000)
            score -= 20;
        else if (this.metrics.pageLoadTime > 2000)
            score -= 10;
        else if (this.metrics.pageLoadTime > 1000)
            score -= 5;
        // Deduct points for slow image loads
        if (this.metrics.imageLoadTime > 1000)
            score -= 15;
        else if (this.metrics.imageLoadTime > 500)
            score -= 10;
        else if (this.metrics.imageLoadTime > 200)
            score -= 5;
        // Deduct points for low cache hit rate
        if (this.metrics.cacheHitRate < 50)
            score -= 15;
        else if (this.metrics.cacheHitRate < 70)
            score -= 10;
        else if (this.metrics.cacheHitRate < 90)
            score -= 5;
        // Add points for good compression
        if (this.metrics.compressionRatio < 0.3)
            score += 10;
        else if (this.metrics.compressionRatio < 0.5)
            score += 5;
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Log performance metrics to console
     */
    static logMetrics() {
        console.log(this.generateReport());
    }
}
exports.PerformanceMonitor = PerformanceMonitor;
PerformanceMonitor.metrics = {
    pageLoadTime: 0,
    imageLoadTime: 0,
    apiResponseTime: 0,
    cacheHitRate: 0,
    compressionRatio: 0,
    bandwidthSaved: 0
};
PerformanceMonitor.imageMetrics = [];
