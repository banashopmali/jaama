"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorrelationMiddleware = void 0;
const common_1 = require("@nestjs/common");
let CorrelationMiddleware = class CorrelationMiddleware {
    use(req, res, next) {
        const headerReqId = req.headers["x-request-id"];
        const requestId = (typeof headerReqId === "string" && headerReqId)
            ? headerReqId
            : `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        req.requestId = requestId;
        res.setHeader("X-Request-ID", requestId);
        next();
    }
};
exports.CorrelationMiddleware = CorrelationMiddleware;
exports.CorrelationMiddleware = CorrelationMiddleware = __decorate([
    (0, common_1.Injectable)()
], CorrelationMiddleware);
