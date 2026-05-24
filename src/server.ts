import { App } from "@/app";
import { loadLocalEnvFiles } from "@shared";

loadLocalEnvFiles();
const app = new App();

try {
  await app.start();
} catch (error) {
  app.instance.log.error({ error }, "falha ao iniciar servidor");
  process.exit(1);
}
