import { App } from "@/app.js";

const app = new App();

try {
  await app.start(Number(process.env.PORT ?? 3000), process.env.HOST ?? "0.0.0.0");
} catch (error) {
  app.instance.log.error({ error }, "falha ao iniciar servidor");
  process.exit(1);
}
