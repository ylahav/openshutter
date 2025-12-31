"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
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
exports.FaceDetectionController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const face_detection_service_1 = require("./face-detection.service");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
let FaceDetectionController = class FaceDetectionController {
    constructor(faceDetectionService) {
        this.faceDetectionService = faceDetectionService;
    }
    /**
     * Detect faces in a photo
     * Path: POST /api/admin/face-recognition/detect
     * Note: Face detection is done client-side, this endpoint stores the results
     */
    detectFaces(body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { photoId, faces, onlyMatched } = body;
                if (!photoId) {
                    throw new common_1.BadRequestException('Photo ID is required');
                }
                if (!faces || !Array.isArray(faces)) {
                    throw new common_1.BadRequestException('Face detection results are required');
                }
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                let objectId;
                try {
                    objectId = new mongoose_1.Types.ObjectId(photoId);
                }
                catch (_error) {
                    throw new common_1.BadRequestException('Invalid photo ID format');
                }
                const photo = yield db.collection('photos').findOne({ _id: objectId });
                if (!photo) {
                    throw new common_1.NotFoundException('Photo not found');
                }
                // Preserve existing matches if face count matches
                const existingFaces = ((_a = photo.faceRecognition) === null || _a === void 0 ? void 0 : _a.faces) || [];
                let updatedFaces = faces.map((face, index) => {
                    const existingFace = existingFaces[index];
                    return {
                        descriptor: face.descriptor, // 128D vector from client-side detection
                        box: face.box,
                        landmarks: face.landmarks,
                        detectedAt: new Date(),
                        // Use provided match or preserve existing match if available
                        matchedPersonId: face.matchedPersonId || (existingFace === null || existingFace === void 0 ? void 0 : existingFace.matchedPersonId)
                            ? new mongoose_1.Types.ObjectId(face.matchedPersonId || existingFace.matchedPersonId)
                            : null,
                        confidence: face.confidence || (existingFace === null || existingFace === void 0 ? void 0 : existingFace.confidence) || null,
                    };
                });
                // If onlyMatched flag is set, filter to only matched faces
                if (onlyMatched) {
                    updatedFaces = updatedFaces.filter((face) => face.matchedPersonId);
                }
                // Collect all matched person IDs
                const matchedPersonIds = updatedFaces
                    .filter((face) => face.matchedPersonId)
                    .map((face) => face.matchedPersonId);
                // Update photo's people array with matched people
                const currentPeople = (photo.people || []).map((p) => p instanceof mongoose_1.Types.ObjectId ? p.toString() : String(p));
                const matchedPersonIdStrings = matchedPersonIds.map((id) => id.toString());
                const updatedPeople = [
                    ...new Set([...currentPeople, ...matchedPersonIdStrings]),
                ].map((id) => new mongoose_1.Types.ObjectId(id));
                yield db.collection('photos').updateOne({ _id: objectId }, {
                    $set: {
                        'faceRecognition.faces': updatedFaces,
                        'faceRecognition.processedAt': new Date(),
                        'faceRecognition.modelVersion': '1.0',
                        people: updatedPeople, // Ensure matched people are in the people array
                    },
                });
                return {
                    success: true,
                    data: {
                        photoId,
                        facesDetected: faces.length,
                        faces: faces.map((face) => ({
                            box: face.box,
                            landmarks: face.landmarks,
                            // Don't send descriptor back to client (too large)
                        })),
                    },
                };
            }
            catch (error) {
                console.error('Failed to detect faces:', error);
                if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                    throw error;
                }
                throw new Error(`Failed to detect faces: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Match detected faces with people in the database
     * Path: POST /api/admin/face-recognition/match
     */
    matchFaces(body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { photoId, threshold = 0.6 } = body;
                if (!photoId) {
                    throw new common_1.BadRequestException('Photo ID is required');
                }
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                let objectId;
                try {
                    objectId = new mongoose_1.Types.ObjectId(photoId);
                }
                catch (_error) {
                    throw new common_1.BadRequestException('Invalid photo ID format');
                }
                const photo = yield db.collection('photos').findOne({ _id: objectId });
                if (!photo) {
                    throw new common_1.NotFoundException('Photo not found');
                }
                if (!((_a = photo.faceRecognition) === null || _a === void 0 ? void 0 : _a.faces) || photo.faceRecognition.faces.length === 0) {
                    throw new common_1.BadRequestException('No faces detected in this photo');
                }
                // Get all people with face descriptors
                const people = yield db
                    .collection('people')
                    .find({
                    'faceRecognition.descriptor': { $exists: true, $ne: null },
                })
                    .toArray();
                // Match faces
                const matches = yield this.faceDetectionService.matchFaces(photo.faceRecognition.faces, people, threshold);
                // Update photo with matched faces
                const updatedFaces = photo.faceRecognition.faces.map((face, index) => {
                    const match = matches.find((m) => m.faceIndex === index);
                    return Object.assign(Object.assign({}, face), { matchedPersonId: (match === null || match === void 0 ? void 0 : match.personId) ? new mongoose_1.Types.ObjectId(match.personId) : null, confidence: (match === null || match === void 0 ? void 0 : match.confidence) || null });
                });
                // Collect matched person IDs
                const matchedPersonIds = matches
                    .filter((m) => m.personId)
                    .map((m) => new mongoose_1.Types.ObjectId(m.personId));
                // Update photo's people array
                const currentPeople = (photo.people || []).map((p) => p instanceof mongoose_1.Types.ObjectId ? p.toString() : String(p));
                const matchedPersonIdStrings = matchedPersonIds.map((id) => id.toString());
                const updatedPeople = [
                    ...new Set([...currentPeople, ...matchedPersonIdStrings]),
                ].map((id) => new mongoose_1.Types.ObjectId(id));
                yield db.collection('photos').updateOne({ _id: objectId }, {
                    $set: {
                        'faceRecognition.faces': updatedFaces,
                        'faceRecognition.matchedAt': new Date(),
                        people: updatedPeople,
                    },
                });
                return {
                    success: true,
                    data: {
                        matches: matches.map((m) => ({
                            faceIndex: m.faceIndex,
                            personId: m.personId,
                            confidence: m.confidence,
                        })),
                    },
                };
            }
            catch (error) {
                console.error('Failed to match faces:', error);
                if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                    throw error;
                }
                throw new Error(`Failed to match faces: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Assign a face to a person
     * Path: POST /api/admin/face-recognition/assign
     */
    assignFace(body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { photoId, faceIndex, personId } = body;
                if (!photoId) {
                    throw new common_1.BadRequestException('Photo ID is required');
                }
                if (faceIndex === undefined || faceIndex === null) {
                    throw new common_1.BadRequestException('Face index is required');
                }
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                let objectId;
                try {
                    objectId = new mongoose_1.Types.ObjectId(photoId);
                }
                catch (_error) {
                    throw new common_1.BadRequestException('Invalid photo ID format');
                }
                const photo = yield db.collection('photos').findOne({ _id: objectId });
                if (!photo) {
                    throw new common_1.NotFoundException('Photo not found');
                }
                if (!((_a = photo.faceRecognition) === null || _a === void 0 ? void 0 : _a.faces) || faceIndex >= photo.faceRecognition.faces.length) {
                    throw new common_1.BadRequestException('Invalid face index');
                }
                // Verify person exists if assigning
                if (personId) {
                    const personObjectId = new mongoose_1.Types.ObjectId(personId);
                    const person = yield db.collection('people').findOne({ _id: personObjectId });
                    if (!person) {
                        throw new common_1.NotFoundException('Person not found');
                    }
                }
                // Update the specific face
                const updatedFaces = [...photo.faceRecognition.faces];
                updatedFaces[faceIndex] = Object.assign(Object.assign({}, updatedFaces[faceIndex]), { matchedPersonId: personId ? new mongoose_1.Types.ObjectId(personId) : null, confidence: personId ? 1.0 : null });
                // Update photo's people array
                const currentPeople = (photo.people || []).map((p) => p instanceof mongoose_1.Types.ObjectId ? p.toString() : String(p));
                let updatedPeople = [...currentPeople];
                if (personId) {
                    updatedPeople = [...new Set([...updatedPeople, personId])];
                }
                else {
                    // If unassigning, we don't remove from people array (photo might have other references)
                }
                const updatedPeopleObjectIds = updatedPeople.map((id) => new mongoose_1.Types.ObjectId(id));
                yield db.collection('photos').updateOne({ _id: objectId }, {
                    $set: {
                        'faceRecognition.faces': updatedFaces,
                        people: updatedPeopleObjectIds,
                    },
                });
                // If assigning to a person, also update the person's descriptor if this face has one
                if (personId && updatedFaces[faceIndex].descriptor) {
                    const personObjectId = new mongoose_1.Types.ObjectId(personId);
                    const person = yield db.collection('people').findOne({ _id: personObjectId });
                    if (person && !((_b = person.faceRecognition) === null || _b === void 0 ? void 0 : _b.descriptor)) {
                        // Only update if person doesn't have a descriptor yet
                        yield db.collection('people').updateOne({ _id: personObjectId }, {
                            $set: {
                                'faceRecognition.descriptor': updatedFaces[faceIndex].descriptor,
                            },
                        });
                    }
                }
                return {
                    success: true,
                    data: {
                        faceIndex,
                        personId,
                    },
                };
            }
            catch (error) {
                console.error('Failed to assign face:', error);
                if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                    throw error;
                }
                throw new Error(`Failed to assign face: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.FaceDetectionController = FaceDetectionController;
__decorate([
    (0, common_1.Post)('detect'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FaceDetectionController.prototype, "detectFaces", null);
__decorate([
    (0, common_1.Post)('match'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FaceDetectionController.prototype, "matchFaces", null);
__decorate([
    (0, common_1.Post)('assign'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FaceDetectionController.prototype, "assignFace", null);
exports.FaceDetectionController = FaceDetectionController = __decorate([
    (0, common_1.Controller)('admin/face-detection'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [face_detection_service_1.FaceDetectionService])
], FaceDetectionController);
