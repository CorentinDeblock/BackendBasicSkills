import { Asset, PrismaClient, User } from "@prisma/client";
import express from "express";
import { APIException, Uploader } from "../utils/httpUtils";
import { deleteFile, getImagePath } from "../utils/fsUtils";
import logger from "../logger";
import settings from "../settings";
import bcrypt from "bcryptjs";
import { authenticateJWT, disconnect } from "../utils/authUtils";

const router = express.Router();
const prisma = new PrismaClient();

type UserBody = Omit<User, "id">;

interface UserInclude {
  articles: boolean;
  opinions: boolean;
  avatar: boolean;
}

type RequestUserBody = express.Request<object, object, UserBody, UserInclude>;
type RequestUserQuery = express.Request<
  { id: string },
  object,
  object,
  UserInclude
>;

type RequestFile = express.Request<{ id: string }, object, object, object>;

async function onCheck(
  req: express.Request,
  res: express.Response
): Promise<Asset | Asset[]> {
  const file = await prisma.asset.findUnique({
    where: {
      userId: req.user!.id,
    },
  });

  if (file === null) {
    throw new APIException(
      req,
      res,
      "Internal server error",
      500,
      { id: req.user!.id },
      undefined
    );
  }

  return [file];
}

async function onUpdate(req: RequestFile, res: express.Response) {
  const asset = await prisma.asset.upsert({
    where: {
      userId: req.params.id,
    },
    update: {
      filename: req.file!.filename,
      path: req.file!.path,
      mimetype: req.file!.mimetype,
      size: req.file!.size,
    },
    create: {
      filename: req.file!.filename,
      path: req.file!.path,
      mimetype: req.file!.mimetype,
      size: req.file!.size,
      userId: req.params.id,
    },
  });

  res.success("Success", asset);
}

const uploader = new Uploader("/assets/images/avatars", onCheck, onUpdate);

router.post("/:id/upload-avatar/", ...uploader.single("avatar"));

async function getUser(req: RequestUserQuery, res: express.Response) {
  if (req.params.id === undefined) {
    throw new APIException(
      req,
      res,
      "User id is required in path. See documentation for more details.",
      400,
      { id: req.params.id },
      undefined
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: req.query,
  });

  if (user === null) {
    throw new APIException(
      req,
      res,
      "User not found",
      404,
      { id: req.params.id },
      undefined
    );
  }

  res.success("Success", user);
}

async function updateUser(req: RequestUserBody, res: express.Response) {
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: req.body,
    include: req.query,
  });

  if (user === null) {
    throw new APIException(
      req,
      res,
      "User not found",
      404,
      { id: req.user!.id },
      undefined
    );
  }

  res.success("Success", user);
}

async function deleteUser(req: express.Request, res: express.Response) {
  const id = req.user!.id;

  disconnect(req, res);

  const user = await prisma.user.delete({
    where: { id },
    include: {
      avatar: true,
    },
  });

  if (user === null) {
    throw new APIException(
      req,
      res,
      "User not found",
      404,
      { id: req.params.id },
      undefined
    );
  }

  if (user.avatar !== null) {
    logger.info(`Deleting avatar ${user.avatar.filename}`);

    await deleteFile(getImagePath("avatars", user.avatar.filename));
  }

  res.status(204).send();
}

async function createUser(req: RequestUserBody, res: express.Response) {
  const { email, password, name } = req.body;

  if (email === undefined || password === undefined || name === undefined) {
    throw new APIException(
      req,
      res,
      "'email', 'password' and 'name' are required, see documentation for more details.",
      400,
      undefined,
      undefined
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: bcrypt.hashSync(password, settings.hashSalt),
      name: name,
    },
    include: req.query,
  });

  if (user === null) {
    throw new APIException(
      req,
      res,
      "Internal server error",
      500,
      undefined,
      new Error("Internal server error")
    );
  }

  res.status(201).success("User created successfully", user);
}

async function getAllUser(req: express.Request, res: express.Response) {
  const users = await prisma.user.findMany({
    include: req.query,
  });

  res.success("Success", users);
}

router.get("/", getAllUser);
router.get("/:id", getUser);
router.put(
  "/",
  authenticateJWT,
  updateUser as unknown as express.RequestHandler
);
router.post("/", createUser);
router.delete("/", authenticateJWT, deleteUser);

export default router;
