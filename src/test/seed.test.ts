import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test("Get all users", async () => {
    const users = await prisma.user.findMany();

    expect(users.length).toBeGreaterThanOrEqual(10); // Should be 10 users

    users.forEach((user) => {
        let userString = `User: ${user.id}\n\tEmail: ${user.email}\n\tName: ${user.name}`;
        console.log(userString);
    });
});

test("Get all articles", async () => {
    const articles = await prisma.article.findMany();
    expect(articles.length).toBeGreaterThanOrEqual(3); // Should be 3 articles

    articles.forEach((article) => {
        let articleString = `Article: ${article.id}\n\tTitle: ${article.title}\n\tContent: ${article.content}`;
        console.log(articleString);
    });
});

test("Get all opinions", async () => {
    const opinions = await prisma.opinion.findMany();
    expect(opinions.length).toBeGreaterThan(0); // Should not be empty

    opinions.forEach((opinion) => {
        let opinionString = `Opinion: ${opinion.id}\n\tLike: ${opinion.opinionType}\n\tUser: ${opinion.userId}\n\tArticle: ${opinion.articleId}`;
        console.log(opinionString);
    });
});
