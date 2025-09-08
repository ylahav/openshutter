declare module 'exif-parser' {
  export class ExifParser {
    static create(buffer: Buffer): ExifParser
    parse(): ExifResult
  }

  export interface ExifResult {
    tags?: {
      Make?: string
      Model?: string
      DateTime?: string
      ExposureTime?: string
      FNumber?: number
      ISO?: number
      FocalLength?: number
      GPSLatitude?: number
      GPSLongitude?: number
      GPSAltitude?: number
      Software?: string
      Copyright?: string
      [key: string]: any
    }
  }
}
