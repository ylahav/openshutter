"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
exports.findAuditLogs = findAuditLogs;
const mongoose_1 = __importDefault(require("mongoose"));
const AuditLogSchema = new mongoose_1.default.Schema({
    action: { type: String, required: true },
    userId: String,
    resourceType: String,
    resourceId: String,
    details: mongoose_1.default.Schema.Types.Mixed,
    ipAddress: String,
    timestamp: { type: Date, default: Date.now }
});
const AuditLogModel = mongoose_1.default.models.AuditLog || mongoose_1.default.model('AuditLog', AuditLogSchema);
function writeAuditLog(entry) {
    return __awaiter(this, void 0, void 0, function* () {
        yield AuditLogModel.create(Object.assign(Object.assign({}, entry), { timestamp: new Date() }));
    });
}
function findAuditLogs(query_1) {
    return __awaiter(this, arguments, void 0, function* (query, limit = 100, skip = 0) {
        const q = {};
        if (query.action)
            q.action = Array.isArray(query.action) ? { $in: query.action } : query.action;
        if (query.userId)
            q.userId = query.userId;
        if (query.resourceType)
            q.resourceType = query.resourceType;
        if (query.resourceId)
            q.resourceId = query.resourceId;
        if (query.since || query.until) {
            q.timestamp = {};
            if (query.since)
                q.timestamp.$gte = query.since;
            if (query.until)
                q.timestamp.$lte = query.until;
        }
        return AuditLogModel
            .find(q)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    });
}
