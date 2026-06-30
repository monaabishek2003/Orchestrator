import { ensureDataDir, runMigrations } from "./db.js";
import { startServer } from "./server.js";

ensureDataDir();
runMigrations();
startServer();
