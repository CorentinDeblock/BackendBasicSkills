import { OpinionType, PrismaClient } from "@prisma/client";
import { ar, faker } from "@faker-js/faker";
import * as _ from "lodash";

const prisma = new PrismaClient()

async function main() {
    console.log("Seeding database...")

    // Create 10 users
    const users = await prisma.user.createManyAndReturn({
        data: Array.from({ length: 10 }).map(() => ({
            name: faker.person.fullName(),
            email: faker.internet.email(),
            password: faker.internet.password(),
        })),
    });

    // Get 100 random users
    const usersSample = _.times(100, () => _.sample(users))

    // Create a article for each user
    const articles = await Promise.all(usersSample.map(async (user) => 
        await prisma.article.create({
            data: {
                title: faker.lorem.sentence(),
                content: faker.lorem.paragraph(),
                authorId: user!.id
            }
        })
    ));

    // For each article, create 10 opinions
    articles.forEach(async (article) => {
        // Get a random number of users to create opinions for
        const usersSample = _.sampleSize(users, _.random(users.length) + 1)

        usersSample.forEach(async (user) => {
            // Create an opinion for the user and the article
            await prisma.opinion.create({
                data: {
                    userId: user.id,
                    articleId: article.id,
                    opinion: Object.values(OpinionType)[
                        faker.number.int({ min: 0, max: 1 })
                    ],
                },
            });
        });
    });

    console.log("Database seeded successfully")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })