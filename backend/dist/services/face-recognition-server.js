"use strict";
/**
 * Server-side Face Recognition Service
 *
 * Uses face-api.js with Node.js canvas for server-side processing
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
exports.FaceRecognitionServerService = void 0;
const canvas_1 = require("canvas");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Lazy load face-api.js to avoid monkeyPatch issues at module load time
let faceapi = null;
let isPatched = false;
function getFaceApi() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!faceapi) {
            // Dynamic import to avoid calling monkeyPatch at module load
            faceapi = yield Promise.resolve().then(() => __importStar(require('face-api.js')));
            // Configure face-api.js to use Node.js canvas
            // Set environment before monkeyPatch
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                // We're in Node.js, ensure face-api.js knows this
                try {
                    const env = faceapi.env;
                    // The issue: face-api.js checks internal environment state, not just isNodejs/isBrowser
                    // We need to ensure the internal environment object is properly initialized
                    // Step 1: Create Node.js environment FIRST (before overriding functions)
                    // This should set up the internal environment state
                    if (typeof env.createNodejsEnv === 'function') {
                        try {
                            // createNodejsEnv should set up the internal environment
                            const nodeEnv = env.createNodejsEnv({ Canvas: canvas_1.Canvas, Image: canvas_1.Image, ImageData: canvas_1.ImageData });
                            console.log('Created Node.js environment using createNodejsEnv()', nodeEnv ? 'with return value' : 'without return value');
                            // If it returns an environment object, try to use setEnv with it
                            if (nodeEnv && typeof env.setEnv === 'function') {
                                try {
                                    // Try setting the environment explicitly
                                    env.setEnv(nodeEnv);
                                    console.log('Set environment using returned nodeEnv object');
                                }
                                catch (e) {
                                    console.warn('setEnv(nodeEnv) failed:', e);
                                }
                            }
                        }
                        catch (e) {
                            console.warn('createNodejsEnv() failed:', e);
                        }
                    }
                    // Step 2: Override environment detection functions
                    // This ensures isNodejs() and isBrowser() return correct values
                    if (typeof env.isNodejs === 'function') {
                        env.isNodejs = function () {
                            return true;
                        };
                    }
                    if (typeof env.isBrowser === 'function') {
                        env.isBrowser = function () {
                            return false;
                        };
                    }
                    // Step 3: Try to set environment explicitly using setEnv if available
                    if (typeof env.setEnv === 'function') {
                        try {
                            // Try setting to 'node' string
                            env.setEnv('node');
                            console.log('Set environment to "node" using setEnv()');
                        }
                        catch (e) {
                            // If that fails, try with an object
                            try {
                                env.setEnv({ isNodejs: true, isBrowser: false });
                                console.log('Set environment using object');
                            }
                            catch (e2) {
                                console.warn('setEnv() failed:', e2);
                            }
                        }
                    }
                    // Step 4: Ensure environment is initialized
                    if (typeof env.initialize === 'function') {
                        try {
                            env.initialize();
                            console.log('Initialized environment');
                        }
                        catch (e) {
                            console.warn('env.initialize() failed:', e);
                        }
                    }
                    // Step 5: Verify environment state
                    console.log('Environment check:', {
                        isNodejs: env.isNodejs ? env.isNodejs() : 'not a function',
                        isBrowser: env.isBrowser ? env.isBrowser() : 'not a function',
                        hasGetEnv: typeof env.getEnv === 'function'
                    });
                    // Check if monkeyPatch is available
                    if (!faceapi.env.monkeyPatch) {
                        throw new Error('monkeyPatch is not available in face-api.js');
                    }
                    // Step 6: Now monkey patch with Node.js canvas
                    // The environment should be properly initialized now
                    faceapi.env.monkeyPatch({ Canvas: canvas_1.Canvas, Image: canvas_1.Image, ImageData: canvas_1.ImageData });
                    isPatched = true;
                    console.log('Face-api.js monkeyPatch successful');
                }
                catch (error) {
                    console.error('Failed to monkey patch face-api.js:', error);
                    console.error('Environment check:', {
                        hasProcess: typeof process !== 'undefined',
                        hasVersions: typeof process !== 'undefined' && !!process.versions,
                        hasNode: typeof process !== 'undefined' && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node),
                        envType: typeof faceapi.env,
                        hasMonkeyPatch: typeof faceapi.env.monkeyPatch === 'function',
                        envKeys: faceapi.env ? Object.keys(faceapi.env) : []
                    });
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    throw new Error(`Failed to initialize face-api.js for Node.js: ${errorMessage}. Make sure canvas package is installed.`);
                }
            }
            else {
                throw new Error('Face-api.js server service can only be used in Node.js environment');
            }
        }
        return faceapi;
    });
}
class FaceRecognitionServerService {
    /**
     * Initialize models path
     */
    static setModelsPath(modelsPath) {
        this.modelsPath = modelsPath;
    }
    /**
     * Load face-api.js models (server-side)
     */
    static loadModels(modelsPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.modelsLoaded) {
                return Promise.resolve();
            }
            if (this.loadingPromise) {
                return this.loadingPromise;
            }
            const pathToModels = modelsPath || this.modelsPath || path.join(process.cwd(), 'public', 'models', 'face-api');
            this.loadingPromise = (() => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Get face-api.js instance (will patch if needed)
                    const faceApi = yield getFaceApi();
                    console.log('FaceRecognitionServerService: Loading models from:', pathToModels);
                    console.log('FaceRecognitionServerService: Current working directory:', process.cwd());
                    console.log('FaceRecognitionServerService: Models path exists:', fs.existsSync(pathToModels));
                    // Check if models directory exists
                    if (!fs.existsSync(pathToModels)) {
                        const absolutePath = path.resolve(pathToModels);
                        console.error('FaceRecognitionServerService: Models directory not found');
                        console.error('  Expected path:', pathToModels);
                        console.error('  Absolute path:', absolutePath);
                        console.error('  Path exists:', fs.existsSync(absolutePath));
                        throw new Error(`Models directory not found: ${pathToModels} (absolute: ${absolutePath})`);
                    }
                    // face-api.js loadFromDisk expects the full path to each model's directory
                    const tinyFacePath = path.join(pathToModels, 'tiny_face_detector');
                    const landmarkPath = path.join(pathToModels, 'face_landmark_68');
                    const recognitionPath = path.join(pathToModels, 'face_recognition');
                    // Verify each model directory exists
                    if (!fs.existsSync(tinyFacePath)) {
                        throw new Error(`Tiny face detector model not found: ${tinyFacePath}`);
                    }
                    if (!fs.existsSync(landmarkPath)) {
                        throw new Error(`Face landmark model not found: ${landmarkPath}`);
                    }
                    if (!fs.existsSync(recognitionPath)) {
                        throw new Error(`Face recognition model not found: ${recognitionPath}`);
                    }
                    console.log('Loading face recognition models from:', {
                        tinyFacePath,
                        landmarkPath,
                        recognitionPath
                    });
                    // Load models one by one to get better error messages
                    try {
                        console.log('Loading tinyFaceDetector...');
                        yield faceApi.nets.tinyFaceDetector.loadFromDisk(tinyFacePath);
                        console.log('tinyFaceDetector loaded successfully');
                    }
                    catch (error) {
                        console.error('Failed to load tinyFaceDetector:', error);
                        throw new Error(`Failed to load tinyFaceDetector model from ${tinyFacePath}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                    try {
                        console.log('Loading faceLandmark68Net...');
                        yield faceApi.nets.faceLandmark68Net.loadFromDisk(landmarkPath);
                        console.log('faceLandmark68Net loaded successfully');
                    }
                    catch (error) {
                        console.error('Failed to load faceLandmark68Net:', error);
                        throw new Error(`Failed to load faceLandmark68Net model from ${landmarkPath}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                    try {
                        console.log('Loading faceRecognitionNet...');
                        yield faceApi.nets.faceRecognitionNet.loadFromDisk(recognitionPath);
                        console.log('faceRecognitionNet loaded successfully');
                    }
                    catch (error) {
                        console.error('Failed to load faceRecognitionNet:', error);
                        throw new Error(`Failed to load faceRecognitionNet model from ${recognitionPath}: ${error instanceof Error ? error.message : String(error)}`);
                    }
                    this.modelsLoaded = true;
                    console.log('Face recognition models loaded successfully (server-side)');
                }
                catch (error) {
                    console.error('Failed to load face recognition models:', error);
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    throw new Error(`Failed to load face recognition models from ${pathToModels}: ${errorMessage}`);
                }
            }))();
            return this.loadingPromise;
        });
    }
    /**
     * Detect faces in an image buffer (server-side)
     * @param imageBuffer Image buffer (JPEG, PNG, etc.)
     * @returns Array of detected faces with descriptors
     */
    static detectFacesFromBuffer(imageBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadModels();
            // Get face-api.js instance
            const faceApi = yield getFaceApi();
            // Load image from buffer using canvas
            // Node.js canvas Image accepts Buffer directly
            const img = new canvas_1.Image();
            img.src = imageBuffer;
            // Wait for image to load (Node.js canvas Image is synchronous for buffers)
            // But we need to handle it asynchronously for face-api.js
            yield new Promise((resolve, reject) => {
                if (img.complete) {
                    resolve();
                }
                else {
                    img.onload = () => resolve();
                    img.onerror = (error) => reject(new Error(`Failed to load image: ${error}`));
                }
            });
            // Detect faces with landmarks
            const detections = yield faceApi
                .detectAllFaces(img, new faceApi.TinyFaceDetectorOptions())
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
     * Find best match for a face descriptor
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
                    confidence: 1 - distance
                };
            }
        }
        return bestMatch;
    }
}
exports.FaceRecognitionServerService = FaceRecognitionServerService;
FaceRecognitionServerService.modelsLoaded = false;
FaceRecognitionServerService.loadingPromise = null;
