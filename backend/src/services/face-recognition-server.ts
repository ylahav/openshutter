/**
 * Server-side Face Recognition Service
 * 
 * Uses face-api.js with Node.js canvas for server-side processing
 */

import { Logger } from '@nestjs/common'
import { Canvas, Image, ImageData } from 'canvas'
import * as fs from 'fs'
import * as path from 'path'

// Lazy load face-api.js to avoid monkeyPatch issues at module load time
let faceapi: typeof import('face-api.js') | null = null
let _isPatched = false

async function getFaceApi() {
  if (!faceapi) {
    // Dynamic import to avoid calling monkeyPatch at module load
    faceapi = await import('face-api.js')
    
    // Configure face-api.js to use Node.js canvas
    // Set environment before monkeyPatch
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      // We're in Node.js, ensure face-api.js knows this
      try {
        const env = faceapi.env as any
        
        // The issue: face-api.js checks internal environment state, not just isNodejs/isBrowser
        // We need to ensure the internal environment object is properly initialized
        
        // Step 1: Create Node.js environment FIRST (before overriding functions)
        // This should set up the internal environment state
        if (typeof env.createNodejsEnv === 'function') {
          try {
            // createNodejsEnv should set up the internal environment
            const nodeEnv = env.createNodejsEnv({ Canvas, Image, ImageData } as any)
            FaceRecognitionServerService.logger.debug(`Created Node.js environment using createNodejsEnv() ${nodeEnv ? 'with return value' : 'without return value'}`)
            
            // If it returns an environment object, try to use setEnv with it
            if (nodeEnv && typeof env.setEnv === 'function') {
              try {
                // Try setting the environment explicitly
                env.setEnv(nodeEnv)
                FaceRecognitionServerService.logger.debug('Set environment using returned nodeEnv object')
              } catch (e) {
                FaceRecognitionServerService.logger.warn(`setEnv(nodeEnv) failed: ${e instanceof Error ? e.message : String(e)}`)
              }
            }
          } catch (e) {
            FaceRecognitionServerService.logger.warn('createNodejsEnv() failed:', e)
          }
        }
        
        // Step 2: Override environment detection functions
        // This ensures isNodejs() and isBrowser() return correct values
        if (typeof env.isNodejs === 'function') {
          env.isNodejs = function() {
            return true
          }
        }
        if (typeof env.isBrowser === 'function') {
          env.isBrowser = function() {
            return false
          }
        }
        
        // Step 3: Try to set environment explicitly using setEnv if available
        if (typeof env.setEnv === 'function') {
          try {
            // Try setting to 'node' string
            env.setEnv('node')
            FaceRecognitionServerService.logger.debug('Set environment to "node" using setEnv()')
          } catch (_e) {
            // If that fails, try with an object
            try {
              env.setEnv({ isNodejs: true, isBrowser: false })
              FaceRecognitionServerService.logger.debug('Set environment using object')
            } catch (_e2) {
              FaceRecognitionServerService.logger.warn('setEnv() failed:', _e2)
            }
          }
        }
        
        // Step 4: Ensure environment is initialized
        if (typeof env.initialize === 'function') {
          try {
            env.initialize()
            FaceRecognitionServerService.logger.debug('Initialized environment')
          } catch (e) {
            FaceRecognitionServerService.logger.warn('env.initialize() failed:', e)
          }
        }
        
        // Step 5: Verify environment state
        FaceRecognitionServerService.logger.debug(`Environment check: ${JSON.stringify({
          isNodejs: env.isNodejs ? env.isNodejs() : 'not a function',
          isBrowser: env.isBrowser ? env.isBrowser() : 'not a function',
          hasGetEnv: typeof env.getEnv === 'function'
        })}`)
        
        // Check if monkeyPatch is available
        if (!faceapi.env.monkeyPatch) {
          throw new Error('monkeyPatch is not available in face-api.js')
        }
        
        // Step 6: Now monkey patch with Node.js canvas
        // The environment should be properly initialized now
        faceapi.env.monkeyPatch({ Canvas, Image, ImageData } as any)
        _isPatched = true
        FaceRecognitionServerService.logger.debug('Face-api.js monkeyPatch successful')
      } catch (error) {
        FaceRecognitionServerService.logger.error(`Failed to monkey patch face-api.js: ${error instanceof Error ? error.message : String(error)}`)
        FaceRecognitionServerService.logger.error(`Environment check: ${JSON.stringify({
          hasProcess: typeof process !== 'undefined',
          hasVersions: typeof process !== 'undefined' && !!process.versions,
          hasNode: typeof process !== 'undefined' && !!process.versions?.node,
          envType: typeof faceapi.env,
          hasMonkeyPatch: typeof faceapi.env.monkeyPatch === 'function',
          envKeys: faceapi.env ? Object.keys(faceapi.env) : []
        })}`)
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to initialize face-api.js for Node.js: ${errorMessage}. Make sure canvas package is installed.`)
      }
    } else {
      throw new Error('Face-api.js server service can only be used in Node.js environment')
    }
  }
  return faceapi
}

export interface FaceDetection {
  descriptor: number[] // 128D face descriptor
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

export class FaceRecognitionServerService {
  private static readonly logger = new Logger(FaceRecognitionServerService.name)
  private static modelsLoaded = false
  private static loadingPromise: Promise<void> | null = null
  private static modelsPath: string

  /**
   * Initialize models path
   */
  static setModelsPath(modelsPath: string): void {
    this.modelsPath = modelsPath
  }

  /**
   * Load face-api.js models (server-side)
   */
  static async loadModels(modelsPath?: string): Promise<void> {
    if (this.modelsLoaded) {
      return Promise.resolve()
    }

    if (this.loadingPromise) {
      return this.loadingPromise
    }

    const pathToModels = modelsPath || this.modelsPath || path.join(process.cwd(), 'public', 'models', 'face-api')

    this.loadingPromise = (async () => {
      try {
        // Get face-api.js instance (will patch if needed)
        const faceApi = await getFaceApi()
        
        FaceRecognitionServerService.logger.debug(`FaceRecognitionServerService: Loading models from: ${pathToModels}`)
        FaceRecognitionServerService.logger.debug(`FaceRecognitionServerService: Current working directory: ${process.cwd()}`)
        FaceRecognitionServerService.logger.debug(`FaceRecognitionServerService: Models path exists: ${fs.existsSync(pathToModels)}`)
        
        // Check if models directory exists
        if (!fs.existsSync(pathToModels)) {
          const absolutePath = path.resolve(pathToModels)
          FaceRecognitionServerService.logger.error('FaceRecognitionServerService: Models directory not found')
          FaceRecognitionServerService.logger.error('  Expected path:', pathToModels)
          FaceRecognitionServerService.logger.error('  Absolute path:', absolutePath)
          FaceRecognitionServerService.logger.error('  Path exists:', fs.existsSync(absolutePath))
          throw new Error(`Models directory not found: ${pathToModels} (absolute: ${absolutePath})`)
        }

        // face-api.js loadFromDisk expects the full path to each model's directory
        const tinyFacePath = path.join(pathToModels, 'tiny_face_detector')
        const landmarkPath = path.join(pathToModels, 'face_landmark_68')
        const recognitionPath = path.join(pathToModels, 'face_recognition')

        // Verify each model directory exists
        if (!fs.existsSync(tinyFacePath)) {
          throw new Error(`Tiny face detector model not found: ${tinyFacePath}`)
        }
        if (!fs.existsSync(landmarkPath)) {
          throw new Error(`Face landmark model not found: ${landmarkPath}`)
        }
        if (!fs.existsSync(recognitionPath)) {
          throw new Error(`Face recognition model not found: ${recognitionPath}`)
        }

        FaceRecognitionServerService.logger.debug(`Loading face recognition models from: ${JSON.stringify({
          tinyFacePath,
          landmarkPath,
          recognitionPath
        })}`)

        // Load models one by one to get better error messages
        try {
          FaceRecognitionServerService.logger.debug('Loading tinyFaceDetector...')
          await faceApi.nets.tinyFaceDetector.loadFromDisk(tinyFacePath)
          FaceRecognitionServerService.logger.debug('tinyFaceDetector loaded successfully')
        } catch (error) {
          FaceRecognitionServerService.logger.error('Failed to load tinyFaceDetector:', error)
          throw new Error(`Failed to load tinyFaceDetector model from ${tinyFacePath}: ${error instanceof Error ? error.message : String(error)}`)
        }

        try {
          FaceRecognitionServerService.logger.debug('Loading faceLandmark68Net...')
          await faceApi.nets.faceLandmark68Net.loadFromDisk(landmarkPath)
          FaceRecognitionServerService.logger.debug('faceLandmark68Net loaded successfully')
        } catch (error) {
          FaceRecognitionServerService.logger.error(`Failed to load faceLandmark68Net: ${error instanceof Error ? error.message : String(error)}`)
          throw new Error(`Failed to load faceLandmark68Net model from ${landmarkPath}: ${error instanceof Error ? error.message : String(error)}`)
        }

        try {
          FaceRecognitionServerService.logger.debug('Loading faceRecognitionNet...')
          await faceApi.nets.faceRecognitionNet.loadFromDisk(recognitionPath)
          FaceRecognitionServerService.logger.debug('faceRecognitionNet loaded successfully')
        } catch (error) {
          FaceRecognitionServerService.logger.error(`Failed to load faceRecognitionNet: ${error instanceof Error ? error.message : String(error)}`)
          throw new Error(`Failed to load faceRecognitionNet model from ${recognitionPath}: ${error instanceof Error ? error.message : String(error)}`)
        }

        this.modelsLoaded = true
        FaceRecognitionServerService.logger.log('Face recognition models loaded successfully (server-side)')
      } catch (error) {
        FaceRecognitionServerService.logger.error(`Failed to load face recognition models: ${error instanceof Error ? error.message : String(error)}`)
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to load face recognition models from ${pathToModels}: ${errorMessage}`)
      }
    })()

    return this.loadingPromise
  }

  /**
   * Detect faces in an image buffer (server-side)
   * @param imageBuffer Image buffer (JPEG, PNG, etc.)
   * @returns Array of detected faces with descriptors
   */
  static async detectFacesFromBuffer(imageBuffer: Buffer): Promise<FaceDetection[]> {
    await this.loadModels()

    // Get face-api.js instance
    const faceApi = await getFaceApi()

    // Load image from buffer using canvas
    // Node.js canvas Image accepts Buffer directly
    const img = new Image()
    img.src = imageBuffer

    // Wait for image to load (Node.js canvas Image is synchronous for buffers)
    // But we need to handle it asynchronously for face-api.js
    await new Promise<void>((resolve, reject) => {
      if (img.complete) {
        resolve()
      } else {
        img.onload = () => resolve()
        img.onerror = (error) => reject(new Error(`Failed to load image: ${error}`))
      }
    })

    // Detect faces with landmarks
    const detections = await faceApi
      .detectAllFaces(img as any, new faceApi.TinyFaceDetectorOptions())
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
   * Calculate Euclidean distance between two face descriptors
   */
  static euclideanDistance(descriptor1: number[], descriptor2: number[]): number {
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
   * Find best match for a face descriptor
   */
  static findBestMatch(
    faceDescriptor: number[],
    knownDescriptors: Array<{ personId: string; descriptor: number[] }>,
    threshold: number = 0.6
  ): { personId: string; confidence: number } | null {
    if (knownDescriptors.length === 0) {
      return null
    }

    let bestMatch: { personId: string; confidence: number } | null = null
    let minDistance = Infinity

    for (const known of knownDescriptors) {
      const distance = this.euclideanDistance(faceDescriptor, known.descriptor)
      
      if (distance < threshold && distance < minDistance) {
        minDistance = distance
        bestMatch = {
          personId: known.personId,
          confidence: 1 - distance
        }
      }
    }

    return bestMatch
  }
}
