import passport from "passport";
import express from "express";
import {
  Strategy as JwtStrategy,
  ExtractJwt,
  StrategyOptionsWithSecret,
} from "passport-jwt";
import { PrismaClient, User } from "@prisma/client";
import { APIException } from "../utils/apiUtils";
import logger from "../logger";
import bcrypt from "bcryptjs";
import settings from "../settings";
import jwt from "jsonwebtoken";
import { disconnect, redis } from "../utils/authUtils";

const router = express.Router();
const prisma = new PrismaClient();

async function login(req: express.Request, res: express.Response) {
  const { email, password } = req.body;

  if (email === undefined || password === undefined) {
    throw new APIException(
      req,
      res,
      "'email' and 'password' are required, see documentation for more details.",
      400,
      undefined,
      undefined
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (user === null) {
    throw new APIException(
      req,
      res,
      "Invalid email or password",
      401,
      undefined,
      new Error("Invalid email or password")
    );
  }

  if (!bcrypt.compareSync(password, user.password)) {
    throw new APIException(
      req,
      res,
      "Invalid email or password",
      401,
      undefined,
      new Error("Invalid email or password")
    );
  }

  const token = jwt.sign({ id: user.id }, settings.jwtSecret, {
    expiresIn: settings.jwtExpiresIn,
  });

  redis.client.set(token, "false");

  res.success("Logged in successfully", { token });
}

function logout(req: express.Request, res: express.Response) {
  disconnect(req, res);
  res.status(204).send();
}

router.post("/login", login);
router.post("/logout", logout);

export default router;
