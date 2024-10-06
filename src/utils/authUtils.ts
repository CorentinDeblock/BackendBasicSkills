import passport from "passport";
import express from "express";
import { APIException } from "./httpUtils";
import settings from "../settings";
import * as _redis from "redis";
import logger from "../logger";
import { PrismaClient } from "@prisma/client";
import session from "express-session";
import {
  ExtractJwt,
  Strategy as JwtStrategy,
  StrategyOptionsWithSecret,
} from "passport-jwt";

const options: StrategyOptionsWithSecret = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: settings.jwtSecret,
};

class Redis {
  private _client: _redis.RedisClientType;
  private static _instance: Redis;

  get client() {
    return this._client;
  }

  private constructor() {
    this._client = _redis.createClient({
      url: "redis://redis:6379",
    });
  }

  static instance() {
    if (this._instance === undefined) {
      this._instance = new Redis();
    }

    return this._instance;
  }
}

const redis = Redis.instance();

async function strategy(jwt_payload: any, done: any) {
  const prisma = new PrismaClient();

  const user = await prisma.user.findUnique({
    where: {
      id: jwt_payload.id,
    },
  });

  if (user === null) {
    logger.info(`Invalid credentials for user ${jwt_payload.id}`);
    return done(null, false, { message: "Invalid credentials" });
  }

  logger.info(`User ${user.email} logged in`);
  return done(null, user);
}

function authenticateJWT(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  passport.authenticate(
    "jwt",
    { session: false },
    async (err: any, user: any, _: any, __: any) => {
      if (err) {
        return next(err);
      }

      const token = req.headers.authorization;

      if (token === undefined) {
        throw new APIException(
          req,
          res,
          "Unauthorized",
          401,
          undefined,
          new Error("Unauthorized")
        );
      }

      const reply = await redis.client.get(token);

      if (reply === "true") {
        throw new APIException(
          req,
          res,
          "Unauthorized",
          401,
          undefined,
          new Error("Unauthorized")
        );
      }

      req.user = user;
      next();
    }
  )(req, res, next);
}

async function passportSetup(app: express.Application) {
  app.use(
    session({
      secret: settings.sessionSecret, // Add this to your settings
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  await redis.client.connect();
}

async function passportClose() {
  await redis.client.quit();
}

function disconnect(req: express.Request, res: express.Response) {
  req.logout((err) => {
    if (err) {
      throw new APIException(
        req,
        res,
        "Internal server error",
        500,
        undefined,
        err
      );
    }

    const token = req.headers.authorization?.split(" ")[1];

    if (token === undefined) {
      throw new APIException(
        req,
        res,
        "Not logged in",
        401,
        undefined,
        new Error("Not logged in")
      );
    }

    redis.client.set(token, "true");

    logger.info(`User ${req.user} logged out`);
  });
}

passport.use(new JwtStrategy(options, strategy));

export { authenticateJWT, passportSetup, passportClose, redis, disconnect };
