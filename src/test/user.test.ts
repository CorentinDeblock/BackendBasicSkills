import express, { request } from "express";
import UserAPI from "../api/userAPI";
import { API } from "../iapi";
import path from "path";
import fs from "fs";
import _, { before, create, includes } from "lodash";
import { User } from "@prisma/client";
import { getProjectRoot, deleteFile } from "../utils/fsUtils";
import axios from "axios";
import FormData from "form-data";
import { faker } from "@faker-js/faker/.";
import https from "https";
import { deleteTempDirectory, downloadImage } from "../utils/httpUtils";

async function sendPicture(filepath: string, user: User) {
    const form = new FormData();
    const file = fs.createReadStream(filepath);
    form.append("avatar", file);

    const res = await axios.post(
        `http://localhost:3000/user/upload-avatar/${user.id}`,
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

async function createUser() {
    const response = await axios.post(
        "http://localhost:3000/user?avatar=true",
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

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty("message", "Success");

    return response.data.data;
}

async function deleteUser(user: User) {
    const res = await axios.delete(`http://localhost:3000/user/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("message", "Success");
}

async function updateUser(user: User, name: string) {
    const res = await axios.put(`http://localhost:3000/user/${user.id}`, {
        name: name,
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("message", "Success");
    expect(res.data.data.name).toBe(name);
}

describe("UserAPI", () => {
    let avatars: string[] = [];
    let avatar = "";
    let avatarUpdate = "";

    let imageWidth = 300;
    let imageHeight = 300;

    beforeAll(async () => {
        avatars = await Promise.all(
            Array.from({ length: 10 }).map(async (_, i) => {
                return await downloadImage(
                    imageWidth,
                    imageHeight,
                    `user-${i}.jpg`
                );
            })
        );

        avatar = await downloadImage(imageWidth, imageHeight, "avatar.jpg");
        avatarUpdate = await downloadImage(
            imageWidth,
            imageHeight,
            "avatarUpdate.jpg"
        );
    });

    it("Should create a user", async () => createUser);

    it("Should upload user avatar", async () => {
        const user = await createUser();
        await sendPicture(avatar, user);
        await deleteUser(user);
    });

    it("Should change user avatar", async () => {
        const user = await createUser();
        await sendPicture(avatarUpdate, user);
        await deleteUser(user);
    });

    it("Should change username", async () => {
        const user = await createUser();
        await updateUser(user, "New name");
        await deleteUser(user);
    });

    it("Should apply photo to user (user are created in this test and deleted in the end of this test)", async () => {
        const userSamples = await Promise.all(
            Array.from({ length: avatars.length }).map(async () => {
                const user = await createUser();
                return user;
            })
        );

        expect(userSamples).toHaveLength(avatars.length);

        await Promise.all(
            userSamples.map(async (user, index) => {
                return await sendPicture(avatars[index], user);
            })
        );

        await Promise.all(
            userSamples.map(async (user) => await deleteUser(user))
        );
    });

    afterAll(async () => {
        deleteTempDirectory();
    });
});
