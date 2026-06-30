import { ensureDataDir, runMigrations } from "./db.js";
import { gitPreflight } from "./git.js";
import { startServer } from "./server.js";

gitPreflight();
ensureDataDir();
runMigrations();
startServer();
