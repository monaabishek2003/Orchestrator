import { prisma, runMigrations } from "./db.js";

runMigrations();
console.log("Orchestrator database ready — migrations applied.");

await prisma.$disconnect();
