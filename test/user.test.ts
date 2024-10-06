import fs from "fs";
import { User } from "@prisma/client";
import axios from "axios";
import FormData from "form-data";
import { faker } from "@faker-js/faker/.";
import { deleteTempDirectory, downloadImage } from "../src/utils/httpUtils";

async function sendPicture(filepath: string, user: User) {
  const form = new FormData();
  const file = fs.createReadStream(filepath);
  form.append("avatar", file);

  const res = await axios.post(
    `http://localhost:3000/user/${user.id}/upload-avatar`,
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
  const data = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
  };

  const response = await axios.post(
    "http://localhost:3000/user?avatar=true",
    data,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );

  expect(response.status).toBe(201);
  expect(response.data).toHaveProperty("message", "User created successfully");
  expect(response.data).toHaveProperty("payload");

  return data;
}

async function deleteUser(token: string) {
  const res = await axios.delete(`http://localhost:3000/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(res.status).toBe(204);
}

async function updateUser(user: User, name: string) {
  const res = await axios.put(`http://localhost:3000/user/${user.id}`, {
    name: name,
  });

  expect(res.status).toBe(200);
  expect(res.data).toHaveProperty("message", "Success");
  expect(res.data.data.name).toBe(name);
}

async function login(user: { email: string; password: string }) {
  const login = await axios.post("http://localhost:3000/auth/login", {
    email: user.email,
    password: user.password,
  });

  expect(login.status).toBe(200);
  expect(login.data).toHaveProperty("message", "Logged in successfully");
  expect(login.data).toHaveProperty("payload");
  expect(login.data.payload).toHaveProperty("token");

  return login.data.payload.token;
}

async function logout(token: string) {
  const logout = await axios.post(
    "http://localhost:3000/auth/logout",
    undefined,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  expect(logout.status).toBe(204);
}

describe("UserAPI", () => {
  // let avatars: string[] = [];
  // let avatar = "";
  // let avatarUpdate = "";

  // const imageWidth = 300;
  // const imageHeight = 300;

  // beforeAll(async () => {
  //     avatars = await Promise.all(
  //         Array.from({ length: 10 }).map(async (_, i) => {
  //             return await downloadImage(
  //                 imageWidth,
  //                 imageHeight,
  //                 `user-${i}.jpg`
  //             );
  //         })
  //     );

  //     avatar = await downloadImage(imageWidth, imageHeight, "avatar.jpg");
  //     avatarUpdate = await downloadImage(
  //         imageWidth,
  //         imageHeight,
  //         "avatarUpdate.jpg"
  //     );
  // });

  it.only("Should login and logout", async () => {
    const user = await createUser();
    const token = await login(user);

    await logout(token);
    const token2 = await login(user);

    await deleteUser(token2);
  });

  it("Should upload user avatar", async () => {
    const user = await createUser();
    // await sendPicture(avatar, user);
    // await deleteUser();
  });

  it("Should change user avatar", async () => {
    // const user = await createUser();
    // await sendPicture(avatarUpdate, user);
    // await deleteUser();
  });

  it("Should change username", async () => {
    // const user = await createUser();
    // await updateUser(user, "New name");
    // await deleteUser();
  });

  it.skip("Should apply photo to user (user are created in this test and deleted in the end of this test)", async () => {
    // const userSamples = await Promise.all(
    //     Array.from({ length: avatars.length }).map(async () => {
    //         const user = await createUser();
    //         return user;
    //     })
    // );
    // expect(userSamples).toHaveLength(avatars.length);
    // await Promise.all(
    //     userSamples.map(async (user, index) => {
    //         return await sendPicture(avatars[index], user);
    //     })
    // );
    // await Promise.all(userSamples.map(async (_) => await deleteUser()));
  });

  afterAll(async () => {
    deleteTempDirectory();
  });
});
