import { OpinionType, Prisma, PrismaClient } from "@prisma/client";
import { ar, faker } from "@faker-js/faker";
import * as _ from "lodash";
import express from "express";
import UserAPI from "../../src/api/userAPI";
import { API } from "../../src/iapi";
import request from "supertest";
import path from "path";
import fs from "fs";
import logger from "../../src/logger";

const prisma = new PrismaClient();

async function main() {
    logger.info("Seeding database...");

    const assetsPath = path.join(__dirname, "assets");

    if (!fs.existsSync(assetsPath)) {
        throw new Error("Assets folder not found");
    }

    const assetDir = fs.readdirSync(assetsPath);

    if (assetDir.length === 0) {
        throw new Error("Assets folder need to have at least one picture");
    }

    const app = express();

    app.use(new API().addAPI(new UserAPI()).apply());

    // Create 10 users
    const users = await prisma.user.createManyAndReturn({
        data: Array.from({ length: 10 }).map(() => ({
            name: faker.person.fullName(),
            email: faker.internet.email(),
            password: faker.internet.password(),
        })),
    });

    _.sampleSize(users, _.random(4, users.length)).forEach(
        async (user, index) => {
            const randomFile = _.sample(assetDir);

            await request(app)
                .post("/user/upload-avatar")
                .field("userId", user.id)
                .attach("avatar", path.join(assetsPath, randomFile!));
        }
    );

    // Get 100 random users
    const usersSample = _.times(100, () => _.sample(users));

    // Create a article for each user
    const articles = await Promise.all(
        usersSample.map(
            async (user) =>
                await prisma.article.create({
                    data: {
                        title: faker.lorem.sentence(),
                        content: faker.lorem.paragraph(),
                        authorId: user!.id,
                    },
                })
        )
    );

    // For each article, create 5 opinions
    articles.forEach(async (article) => {
        // Get a random number of users to create opinions for
        const usersSample = _.sampleSize(users, 5);

        usersSample.forEach(async (user) => {
            try {
                // Create an opinion for the user and the article
                await prisma.opinion.create({
                    data: {
                        userId: user.id,
                        articleId: article.id,
                        opinionType:
                            Object.values(OpinionType)[
                                faker.number.int({ min: 0, max: 1 })
                            ],
                    },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    if (error.code !== "P2002") {
                        logger.error(`${error.code} - ${error.message}`);
                    }
                }
            }
        });
    });

    logger.info("Database seeded successfully");
}

main()
    .catch((e) => {
        logger.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
