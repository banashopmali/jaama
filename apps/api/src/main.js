"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const config_1 = require("@jaama/config");
const observability_1 = require("@jaama/observability");
async function bootstrap() {
    const config = (0, config_1.validateEnvironment)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Security Headers & CORS
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: config.corsAllowedOrigins,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true,
    });
    // Enable Graceful Shutdown
    app.enableShutdownHooks();
    await app.listen(config.port);
    observability_1.logger.info(`JAAMA API Server listening on port ${config.port}`, {
        context: { environment: config.nodeEnv, port: config.port },
    });
}
if (require.main === module) {
    bootstrap().catch((err) => {
        observability_1.logger.error("Démarrage de l'API échoué", { context: { error: err.message } });
        process.exit(1);
    });
}
