import express, { request } from "express";
import UserAPI from "../api/userAPI";
import { API } from "../iapi";
import path from "path";
import fs from "fs";
import _, { create, includes } from "lodash";
import { Article, User } from "@prisma/client";
import axios from "axios";
import FormData from "form-data";
import { ar, faker } from "@faker-js/faker/.";
import https from "https";
import { deleteTempDirectory, downloadImage } from "../utils/httpUtils";

async function createArticle(user: User): Promise<Article> {
    const response = await axios.post(
        "http://localhost:3000/article?assets=true",
        {
            title: faker.lorem.sentence(),
            content: faker.lorem.paragraph(),
            authorId: user.id,
        },
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
        }
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message", "Success");

    return response.data.data;
}

async function deleteArticle(article: Article) {
    const res = await axios.delete(
        `http://localhost:3000/article/${article.id}`
    );

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("message", "Success");
}

async function createUser() {
    const response = await axios.post(
        "http://localhost:3000/user",
        {
            name: faker.person.fullName(),
            email: faker.internet.email(),
            password: faker.internet.password(),
        },
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
        }
    );

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message", "Success");

    return response.data.data;
}

async function deleteUser(user: User) {
    const res = await axios.delete(`http://localhost:3000/user/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("message", "Success");
}

async function createOpinion(article: Article, user: User) {
    const res = await axios.post(
        `http://localhost:3000/article/${article.id}/opinion/${user.id}`,
        {
            opinion: faker.helpers.arrayElement(["LIKE", "DISLIKE"]),
        }
    );

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("message", "Success");
}

async function deleteOpinion(article: Article, user: User) {
    const res = await axios.delete(
        `http://localhost:3000/article/${article.id}/opinion/${user.id}`
    );
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("message", "Success");
}

async function updateArticle(article: Article, title: string) {
    const res = await axios.put(`http://localhost:3000/article/${article.id}`, {
        title: title,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("message", "Success");
    expect(res.data.data.title).toBe(title);
}

async function sendPictures(article: Article, pictures: string[]) {
    const form = new FormData();

    pictures.forEach((picture) => {
        const file = fs.createReadStream(picture);
        form.append("articles", file);
    });

    const res = await axios.post(
        `http://localhost:3000/article/upload-file/${article.id}`,
        form,
        {
            headers: {
                ...form.getHeaders(),
            },
        }
    );

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("message", "Success");
}

describe("ArticleAPI", () => {
    let images: string[] = [];

    let imageWidth = 300;
    let imageHeight = 300;

    beforeAll(async () => {
        images = await Promise.all(
            Array.from({ length: 10 }).map(async (_, i) => {
                return await downloadImage(
                    imageWidth,
                    imageHeight,
                    `article-${i}.jpg`
                );
            })
        );
    });

    it("Should create a article", async () => {
        const user = await createUser();
        const article = await createArticle(user);
        await deleteArticle(article);
        await deleteUser(user);
    });

    it("Should change article title", async () => {
        const user = await createUser();
        const article = await createArticle(user);

        await updateArticle(article, "New title");
        await deleteArticle(article);
        await deleteUser(user);
    });

    it("Should delete a article with opinions on it", async () => {
        const user = await createUser();
        const article = await createArticle(user);

        await Promise.all(
            Array.from({ length: 10 }).map(async () => {
                const user = await createUser();
                await createOpinion(article, user);
                await deleteUser(user);
            })
        );

        await deleteArticle(article);
        await deleteUser(user);
    });

    it("Should send multiple picture to only one article", async () => {
        const user = await createUser();
        const article = await createArticle(user);

        await sendPictures(article, images);
        await deleteArticle(article);
        await deleteUser(user);
    });

    it("Should apply photo to article (data are created in this test and deleted in the end of this test)", async () => {
        const user = await createUser();

        const articleSamples = await Promise.all(
            Array.from({ length: images.length }).map(async () => {
                const article = await createArticle(user);

                return article;
            })
        );

        expect(articleSamples).toHaveLength(images.length);

        await Promise.all(
            articleSamples.map(async (article, index) => {
                return await sendPictures(article, _.sampleSize(images, 3));
            })
        );

        await Promise.all(
            articleSamples.map(async (article) => {
                await deleteArticle(article);
            })
        );

        await deleteUser(user);
    });

    it("Shoud delete a opinion on article", async () => {
        const user = await createUser();
        const article = await createArticle(user);
        await createOpinion(article, user);
        await deleteOpinion(article, user);
        await deleteArticle(article);
        await deleteUser(user);
    });

    afterAll(async () => deleteTempDirectory());
});
