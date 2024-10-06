import prisma from "@prisma/client";

export async function cleanDatabase() {
  const client = new prisma.PrismaClient();

  await client.user.deleteMany();
  await client.article.deleteMany();
}

cleanDatabase();
