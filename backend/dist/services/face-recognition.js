"use strict";
/**
 * Face Recognition Service
 *
 * Provides face detection and recognition capabilities using face-api.js
 * Supports both client-side (browser) and server-side (Node.js) processing
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceRecognitionService = void 0;
const faceapi = __importStar(require("face-api.js"));
class FaceRecognitionService {
    /**
     * Load face-api.js models
     * Should be called before using detection/recognition functions
     */
    static loadModels() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.modelsLoaded) {
                return Promise.resolve();
            }
            if (this.loadingPromise) {
                return this.loadingPromise;
            }
            this.loadingPromise = (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Load models from public directory
                    // face-api.js expects models in subdirectories matching the model names
                    // We need to specify the full path to each model's directory
                    const MODEL_BASE_URL = '/models/face-api';
                    yield Promise.all([
                        // tinyFaceDetector: looks in /models/face-api/tiny_face_detector/
                        faceapi.nets.tinyFaceDetector.loadFromUri(`${MODEL_BASE_URL}/tiny_face_detector`),
                        // faceLandmark68Net: looks in /models/face-api/face_landmark_68/
                        faceapi.nets.faceLandmark68Net.loadFromUri(`${MODEL_BASE_URL}/face_landmark_68`),
                        // faceRecognitionNet: looks in /models/face-api/face_recognition/
                        faceapi.nets.faceRecognitionNet.loadFromUri(`${MODEL_BASE_URL}/face_recognition`)
                    ]);
                    this.modelsLoaded = true;
                    console.log('Face recognition models loaded successfully');
                }
                catch (error) {
                    console.error('Failed to load face recognition models:', error);
                    console.error('Model base URL:', '/models/face-api');
                    console.error('Expected structure:');
                    console.error('  /models/face-api/tiny_face_detector/tiny_face_detector_model-weights_manifest.json');
                    console.error('  /models/face-api/face_landmark_68/face_landmark_68_model-weights_manifest.json');
                    console.error('  /models/face-api/face_recognition/face_recognition_model-weights_manifest.json');
                    throw new Error('Failed to load face recognition models. Please ensure models are available at /models/face-api with subdirectories: tiny_face_detector, face_landmark_68, face_recognition');
                }
            }))();
            return this.loadingPromise;
        });
    }
    /**
     * Detect faces in an image (client-side)
     * @param image HTMLImageElement, HTMLCanvasElement, or image URL
     * @returns Array of detected faces with descriptors
     */
    static detectFaces(image, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            yield this.loadModels();
            let input;
            if (typeof image === 'string') {
                // Load image from URL
                const img = new Image();
                img.crossOrigin = 'anonymous';
                yield new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = image;
                });
                input = img;
            }
            else {
                input = image;
            }
            // Detect faces with landmarks
            // Use configurable scoreThreshold (default 0.3) for better detection
            // Lower values detect more faces but may include false positives
            const scoreThreshold = (_a = options === null || options === void 0 ? void 0 : options.scoreThreshold) !== null && _a !== void 0 ? _a : 0.3;
            const inputSize = (_b = options === null || options === void 0 ? void 0 : options.inputSize) !== null && _b !== void 0 ? _b : 416;
            const detections = yield faceapi
                .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({
                scoreThreshold,
                inputSize
            }))
                .withFaceLandmarks()
                .withFaceDescriptors();
            return detections.map(detection => ({
                descriptor: Array.from(detection.descriptor),
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
            }));
        });
    }
    /**
     * Detect face in a specific region of an image
     * Useful for manual face selection when auto-detection misses faces
     * @param image HTMLImageElement or HTMLCanvasElement
     * @param box Region to search for face { x, y, width, height }
     * @returns Face detection if found, null otherwise
     */
    static detectFaceInRegion(image, box) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadModels();
            // Create a canvas to crop the region
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx)
                return null;
            // Set canvas size to the region size
            canvas.width = box.width;
            canvas.height = box.height;
            // Draw the cropped region
            ctx.drawImage(image, box.x, box.y, box.width, box.height, // Source region
            0, 0, box.width, box.height // Destination
            );
            // Detect faces in the cropped region with very low threshold
            const detections = yield faceapi
                .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({
                scoreThreshold: 0.1, // Very low threshold for manual selection
                inputSize: 416
            }))
                .withFaceLandmarks()
                .withFaceDescriptors();
            if (detections.length === 0) {
                return null;
            }
            // Use the first (and likely only) detection
            // Adjust coordinates back to original image space
            const detection = detections[0];
            const adjustedBox = {
                x: box.x + detection.detection.box.x,
                y: box.y + detection.detection.box.y,
                width: detection.detection.box.width,
                height: detection.detection.box.height
            };
            return {
                descriptor: Array.from(detection.descriptor),
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
            };
        });
    }
    /**
     * Match a face descriptor against known person descriptors
     * @param faceDescriptor 128D face descriptor to match
     * @param knownDescriptors Array of known person descriptors with IDs
     * @param threshold Distance threshold for matching (default: 0.6, lower = stricter)
     * @returns Best match if found, null otherwise
     */
    static findBestMatch(faceDescriptor, knownDescriptors, threshold = 0.6) {
        if (knownDescriptors.length === 0) {
            return null;
        }
        let bestMatch = null;
        let minDistance = Infinity;
        for (const known of knownDescriptors) {
            const distance = this.euclideanDistance(faceDescriptor, known.descriptor);
            if (distance < threshold && distance < minDistance) {
                minDistance = distance;
                bestMatch = {
                    personId: known.personId,
                    confidence: 1 - distance, // Convert distance to confidence (0-1)
                    descriptor: known.descriptor
                };
            }
        }
        return bestMatch;
    }
    /**
     * Calculate Euclidean distance between two face descriptors
     */
    static euclideanDistance(descriptor1, descriptor2) {
        if (descriptor1.length !== descriptor2.length) {
            throw new Error('Descriptors must have the same length');
        }
        let sum = 0;
        for (let i = 0; i < descriptor1.length; i++) {
            const diff = descriptor1[i] - descriptor2[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }
    /**
     * Check if models are loaded
     */
    static areModelsLoaded() {
        return this.modelsLoaded;
    }
    /**
     * Reset models (useful for testing or reloading)
     */
    static reset() {
        this.modelsLoaded = false;
        this.loadingPromise = null;
    }
}
exports.FaceRecognitionService = FaceRecognitionService;
FaceRecognitionService.modelsLoaded = false;
FaceRecognitionService.loadingPromise = null;
