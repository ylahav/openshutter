import { Logger } from '@nestjs/common'

/**
 * Extracts IPTC and XMP metadata from image buffers using exifr.
 * IPTC: captions, keywords, copyright, creator, location (city/country), etc.
 * XMP: Dublin Core, Photoshop, and other namespaces (title, description, subject, etc.)
 */
export class IptcXmpExtractor {
  private static readonly logger = new Logger(IptcXmpExtractor.name)

  /**
   * Extract IPTC and XMP data from an image buffer.
   * Returns a plain object suitable for storing in the database (iptcXmp field).
   */
  static async extractIptcXmpData(imageBuffer: Buffer): Promise<Record<string, unknown> | null> {
    try {
      const exifr = await import('exifr')
      const result = await exifr.parse(imageBuffer, {
        tiff: false,
        iptc: true,
        xmp: true,
        mergeOutput: true,
        translateKeys: true,
        translateValues: true,
        reviveValues: true
      })

      if (!result || typeof result !== 'object') {
        return null
      }

      // Remove raw XMP string if present (large and redundant)
      const out = { ...result }
      if ('xmp' in out && typeof (out as any).xmp === 'string') {
        delete (out as any).xmp
      }
      if ('errors' in out) {
        delete (out as any).errors
      }

      // Sanitize for MongoDB: convert Date to ISO string so they serialize consistently, drop undefined
      const sanitized: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(out)) {
        if (value === undefined) continue
        if (value instanceof Date) {
          sanitized[key] = value.toISOString()
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map((v) => (v instanceof Date ? v.toISOString() : v))
        } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
          sanitized[key] = value
        } else {
          sanitized[key] = value
        }
      }

      if (Object.keys(sanitized).length === 0) {
        return null
      }

      IptcXmpExtractor.logger.debug(
        `Extracted IPTC/XMP keys: ${Object.keys(sanitized).join(', ')}`
      )
      return sanitized
    } catch (error) {
      IptcXmpExtractor.logger.warn(
        'Failed to extract IPTC/XMP data:',
        error instanceof Error ? error.message : String(error)
      )
      return null
    }
  }
}
