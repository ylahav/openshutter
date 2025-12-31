"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
const common_1 = require("@nestjs/common");
let FaceRecognitionService = class FaceRecognitionService {
    /**
     * Detect faces in an image
     * Note: This uses client-side face-api.js models
     * For server-side detection, we would need to use face-recognition-server service
     */
    detectFaces(_imageUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            // For now, this is a placeholder
            // In a real implementation, we would either:
            // 1. Use server-side face detection (requires face-api.js server-side setup)
            // 2. Accept face detections from the client
            // For now, we'll accept detections from the client
            throw new Error('Server-side face detection not implemented. Please use client-side detection.');
        });
    }
    /**
     * Find best match for a single face descriptor
     */
    findBestMatch(faceDescriptor, knownDescriptors, threshold = 0.6) {
        let bestMatch = null;
        for (const known of knownDescriptors) {
            const distance = this.euclideanDistance(faceDescriptor, known.descriptor);
            const confidence = 1 - distance;
            if (confidence >= threshold) {
                if (!bestMatch || distance < bestMatch.distance) {
                    bestMatch = {
                        personId: known.personId,
                        distance,
                    };
                }
            }
        }
        return bestMatch
            ? {
                personId: bestMatch.personId,
                confidence: 1 - bestMatch.distance,
            }
            : null;
    }
    /**
     * Match detected faces with people in the database
     */
    matchFaces(faces_1, people_1) {
        return __awaiter(this, arguments, void 0, function* (faces, people, threshold = 0.6) {
            const matches = [];
            // Normalize descriptor to ensure it's a number[] array
            const normalizeDescriptor = (desc) => {
                if (!desc)
                    return null;
                let normalized;
                if (Array.isArray(desc)) {
                    normalized = Array.from(desc).map((n) => {
                        const num = typeof n === 'number' ? n : parseFloat(String(n));
                        return isNaN(num) ? 0 : num;
                    });
                }
                else if (desc instanceof Float32Array) {
                    normalized = Array.from(desc);
                }
                else if (desc instanceof ArrayBuffer) {
                    normalized = Array.from(new Float32Array(desc));
                }
                else {
                    try {
                        normalized = Array.from(desc);
                    }
                    catch (_a) {
                        return null;
                    }
                }
                if (normalized.length !== 128) {
                    console.warn(`Descriptor has incorrect length: ${normalized.length}, expected 128`);
                    return null;
                }
                return normalized;
            };
            // Prepare known descriptors
            const knownDescriptors = people
                .map((person) => {
                var _a;
                const normalized = normalizeDescriptor((_a = person.faceRecognition) === null || _a === void 0 ? void 0 : _a.descriptor);
                return normalized
                    ? {
                        personId: person._id.toString(),
                        descriptor: normalized,
                    }
                    : null;
            })
                .filter((d) => d !== null);
            // Match each detected face
            for (let i = 0; i < faces.length; i++) {
                const face = faces[i];
                const faceDescriptor = normalizeDescriptor(face.descriptor);
                if (!faceDescriptor) {
                    matches.push({
                        faceIndex: i,
                        personId: null,
                        confidence: null,
                    });
                    continue;
                }
                // Find best match
                let bestMatch = null;
                for (const known of knownDescriptors) {
                    const distance = this.euclideanDistance(faceDescriptor, known.descriptor);
                    const confidence = 1 - distance; // Convert distance to confidence (lower distance = higher confidence)
                    if (confidence >= threshold) {
                        if (!bestMatch || distance < bestMatch.distance) {
                            bestMatch = {
                                personId: known.personId,
                                distance,
                            };
                        }
                    }
                }
                matches.push({
                    faceIndex: i,
                    personId: bestMatch ? bestMatch.personId : null,
                    confidence: bestMatch ? 1 - bestMatch.distance : null,
                });
            }
            return matches;
        });
    }
    /**
     * Calculate Euclidean distance between two face descriptors
     */
    euclideanDistance(descriptor1, descriptor2) {
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
};
exports.FaceRecognitionService = FaceRecognitionService;
exports.FaceRecognitionService = FaceRecognitionService = __decorate([
    (0, common_1.Injectable)()
], FaceRecognitionService);
