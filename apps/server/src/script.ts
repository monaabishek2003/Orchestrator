import prisma from "./lib/prisma";

async function main() {
  // 🔹 Create an agent with events
  const agent = await prisma.agent.create({
    data: {
      name: "Planner Agent",
      status: "running",
      needsAttention: false,
      events: {
        create: [
          {
            type: "info",
            message: "Agent started successfully",
            tokens: 120,
            cost: 0.002,
          },
          {
            type: "info",
            message: "Planning task initialized",
            tokens: 80,
            cost: 0.001,
          },
        ],
      },
    },
    include: {
      events: true,
    },
  });

  console.log("✅ Created agent:", agent);

  // 🔹 Fetch all agents with their events
  const allAgents = await prisma.agent.findMany({
    include: {
      events: true,
    },
  });

  console.log("📊 All agents:");
  console.log(JSON.stringify(allAgents, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });