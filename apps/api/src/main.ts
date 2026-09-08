import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { validateEnvironment } from "@jaama/config";
import { logger } from "@jaama/observability";

async function bootstrap() {
  const config = validateEnvironment();
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security Headers & CORS
  app.use(helmet());
  app.enableCors({
    origin: config.corsAllowedOrigins,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  // Enable Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(config.port);
  logger.info(`JAAMA API Server listening on port ${config.port}`, {
    context: { environment: config.nodeEnv, port: config.port },
  });
}

if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error("Démarrage de l'API échoué", { context: { error: err.message } });
    process.exit(1);
  });
}
