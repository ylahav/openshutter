"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceDetectionModule = void 0;
const common_1 = require("@nestjs/common");
const face_detection_controller_1 = require("./face-detection.controller");
const face_detection_service_1 = require("./face-detection.service");
let FaceDetectionModule = class FaceDetectionModule {
};
exports.FaceDetectionModule = FaceDetectionModule;
exports.FaceDetectionModule = FaceDetectionModule = __decorate([
    (0, common_1.Module)({
        controllers: [face_detection_controller_1.FaceDetectionController],
        providers: [face_detection_service_1.FaceDetectionService],
    })
], FaceDetectionModule);
