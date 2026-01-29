/**
 * Face Detection Service
 * 
 * Provides face detection and recognition capabilities using face-api.js
 * Client-side only (browser) - must not be executed during SSR
 */

import { logger } from '$lib/utils/logger'

// Dynamic import to avoid SSR issues
let faceapi: typeof import('face-api.js') | null = null;

async function getFaceApi() {
	if (typeof window === 'undefined') {
		throw new Error('Face detection service can only be used in the browser');
	}
	if (!faceapi) {
		faceapi = await import('face-api.js');
	}
	return faceapi;
}

export interface FaceDetection {
  descriptor: Float32Array | number[] // 128D face descriptor
  box: {
    x: number
    y: number
    width: number
    height: number
  }
  landmarks?: {
    leftEye: { x: number; y: number }
    rightEye: { x: number; y: number }
    nose: { x: number; y: number }
    mouth: { x: number; y: number }
  }
}

export interface FaceMatch {
  personId: string
  confidence: number
  descriptor: number[]
}

export class FaceRecognitionService {
  private static modelsLoaded = false
  private static loadingPromise: Promise<void> | null = null

  /**
   * Load face-api.js models
   * Should be called before using detection/recognition functions
   */
  static async loadModels(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Face detection models can only be loaded in the browser');
    }

    if (this.modelsLoaded) {
      return Promise.resolve()
    }

    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = (async () => {
      try {
        // Load face-api.js dynamically (browser only)
        const faceapi = await getFaceApi();
        
        // Load models from public directory
        // face-api.js expects models in subdirectories matching the model names
        // We need to specify the full path to each model's directory
        const MODEL_BASE_URL = '/models/face-api'
        
        await Promise.all([
          // tinyFaceDetector: looks in /models/face-api/tiny_face_detector/
          faceapi.nets.tinyFaceDetector.loadFromUri(`${MODEL_BASE_URL}/tiny_face_detector`),
          // faceLandmark68Net: looks in /models/face-api/face_landmark_68/
          faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_BASE_URL}/face_landmark_68`),
          // faceRecognitionNet: looks in /models/face-api/face_recognition/
          faceapi.nets.faceRecognitionNet.loadFromUri(`${MODEL_BASE_URL}/face_recognition`)
        ])

        this.modelsLoaded = true
        logger.info('Face detection models loaded successfully')
      } catch (error) {
        logger.error('Failed to load face detection models:', error)
        logger.error('Model base URL:', '/models/face-api')
        logger.error('Expected structure:')
        logger.error('  /models/face-api/tiny_face_detector/tiny_face_detector_model-weights_manifest.json')
        logger.error('  /models/face-api/face_landmark_68/face_landmark_68_model-weights_manifest.json')
        logger.error('  /models/face-api/face_recognition/face_recognition_model-weights_manifest.json')
        throw new Error('Failed to load face detection models. Please ensure models are available at /models/face-api with subdirectories: tiny_face_detector, face_landmark_68, face_recognition')
      }
    })()

    return this.loadingPromise
  }

  /**
   * Detect faces in an image (client-side)
   * @param image HTMLImageElement, HTMLCanvasElement, or image URL
   * @returns Array of detected faces with descriptors
   */
  static async detectFaces(
    image: HTMLImageElement | HTMLCanvasElement | string,
    options?: { scoreThreshold?: number; inputSize?: number }
  ): Promise<FaceDetection[]> {
    if (typeof window === 'undefined') {
      throw new Error('Face detection can only be used in the browser');
    }

    await this.loadModels()
    const faceapi = await getFaceApi();

    let input: HTMLImageElement | HTMLCanvasElement

    if (typeof image === 'string') {
      // Load image from URL
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = image
      })
      input = img
    } else {
      input = image
    }

    // Detect faces with landmarks
    // Use configurable scoreThreshold (default 0.3) for better detection
    // Lower values detect more faces but may include false positives
    const scoreThreshold = options?.scoreThreshold ?? 0.3
    const inputSize = options?.inputSize ?? 416
    
    const detections = await faceapi
      .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({ 
        scoreThreshold,
        inputSize
      }))
      .withFaceLandmarks()
      .withFaceDescriptors()

    return detections.map(detection => ({
      descriptor: Array.from(detection.descriptor) as number[],
      box: {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height
      },
      landmarks: detection.landmarks ? {
        leftEye: {
          x: detection.landmarks.getLeftEye()[0].x,
          y: detection.landmarks.getLeftEye()[0].y
        },
        rightEye: {
          x: detection.landmarks.getRightEye()[0].x,
          y: detection.landmarks.getRightEye()[0].y
        },
        nose: {
          x: detection.landmarks.getNose()[0].x,
          y: detection.landmarks.getNose()[0].y
        },
        mouth: {
          x: detection.landmarks.getMouth()[0].x,
          y: detection.landmarks.getMouth()[0].y
        }
      } : undefined
    }))
  }

  /**
   * Detect face in a specific region of an image
   * Useful for manual face selection when auto-detection misses faces
   * @param image HTMLImageElement or HTMLCanvasElement
   * @param box Region to search for face { x, y, width, height }
   * @returns Face detection if found, null otherwise
   */
  static async detectFaceInRegion(
    image: HTMLImageElement | HTMLCanvasElement,
    box: { x: number; y: number; width: number; height: number }
  ): Promise<FaceDetection | null> {
    if (typeof window === 'undefined') {
      throw new Error('Face detection can only be used in the browser');
    }

    await this.loadModels()
    const faceapi = await getFaceApi();

    // Create a canvas to crop the region
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Set canvas size to the region size
    canvas.width = box.width
    canvas.height = box.height

    // Draw the cropped region
    ctx.drawImage(
      image,
      box.x, box.y, box.width, box.height, // Source region
      0, 0, box.width, box.height // Destination
    )

    // Detect faces in the cropped region with very low threshold
    const detections = await faceapi
      .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({ 
        scoreThreshold: 0.1, // Very low threshold for manual selection
        inputSize: 416
      }))
      .withFaceLandmarks()
      .withFaceDescriptors()

    if (detections.length === 0) {
      return null
    }

    // Use the first (and likely only) detection
    // Adjust coordinates back to original image space
    const detection = detections[0]
    const adjustedBox = {
      x: box.x + detection.detection.box.x,
      y: box.y + detection.detection.box.y,
      width: detection.detection.box.width,
      height: detection.detection.box.height
    }

    return {
      descriptor: Array.from(detection.descriptor) as number[],
      box: adjustedBox,
      landmarks: detection.landmarks ? {
        leftEye: {
          x: box.x + detection.landmarks.getLeftEye()[0].x,
          y: box.y + detection.landmarks.getLeftEye()[0].y
        },
        rightEye: {
          x: box.x + detection.landmarks.getRightEye()[0].x,
          y: box.y + detection.landmarks.getRightEye()[0].y
        },
        nose: {
          x: box.x + detection.landmarks.getNose()[0].x,
          y: box.y + detection.landmarks.getNose()[0].y
        },
        mouth: {
          x: box.x + detection.landmarks.getMouth()[0].x,
          y: box.y + detection.landmarks.getMouth()[0].y
        }
      } : undefined
    }
  }

  /**
   * Match a face descriptor against known person descriptors
   * @param faceDescriptor 128D face descriptor to match
   * @param knownDescriptors Array of known person descriptors with IDs
   * @param threshold Distance threshold for matching (default: 0.6, lower = stricter)
   * @returns Best match if found, null otherwise
   */
  static findBestMatch(
    faceDescriptor: number[],
    knownDescriptors: Array<{ personId: string; descriptor: number[] }>,
    threshold: number = 0.6
  ): FaceMatch | null {
    if (knownDescriptors.length === 0) {
      return null
    }

    let bestMatch: FaceMatch | null = null
    let minDistance = Infinity

    for (const known of knownDescriptors) {
      const distance = this.euclideanDistance(faceDescriptor, known.descriptor)
      
      if (distance < threshold && distance < minDistance) {
        minDistance = distance
        bestMatch = {
          personId: known.personId,
          confidence: 1 - distance, // Convert distance to confidence (0-1)
          descriptor: known.descriptor
        }
      }
    }

    return bestMatch
  }

  /**
   * Calculate Euclidean distance between two face descriptors
   */
  private static euclideanDistance(descriptor1: number[], descriptor2: number[]): number {
    if (descriptor1.length !== descriptor2.length) {
      throw new Error('Descriptors must have the same length')
    }

    let sum = 0
    for (let i = 0; i < descriptor1.length; i++) {
      const diff = descriptor1[i] - descriptor2[i]
      sum += diff * diff
    }

    return Math.sqrt(sum)
  }

  /**
   * Check if models are loaded
   */
  static areModelsLoaded(): boolean {
    return this.modelsLoaded
  }

  /**
   * Reset models (useful for testing or reloading)
   */
  static reset(): void {
    this.modelsLoaded = false
    this.loadingPromise = null
  }
}
