import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  public use(req: Request, res: Response, next: NextFunction) {
    const headerReqId = req.headers["x-request-id"];
    const requestId = (typeof headerReqId === "string" && headerReqId)
      ? headerReqId
      : `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    (req as any).requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
  }
}
