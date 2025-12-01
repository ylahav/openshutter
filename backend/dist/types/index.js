"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApiPhoto = exports.isApiAlbum = exports.isTemplatePhoto = exports.isTemplateAlbum = void 0;
// Type guard functions
const isTemplateAlbum = (album) => {
    return 'createdAt' in album && typeof album.createdAt === 'string';
};
exports.isTemplateAlbum = isTemplateAlbum;
const isTemplatePhoto = (photo) => {
    return 'uploadedAt' in photo && typeof photo.uploadedAt === 'string';
};
exports.isTemplatePhoto = isTemplatePhoto;
const isApiAlbum = (album) => {
    return 'childAlbumCount' in album && typeof album.childAlbumCount === 'number';
};
exports.isApiAlbum = isApiAlbum;
const isApiPhoto = (photo) => {
    return 'thumbnailUrl' in photo && typeof photo.thumbnailUrl === 'string';
};
exports.isApiPhoto = isApiPhoto;
