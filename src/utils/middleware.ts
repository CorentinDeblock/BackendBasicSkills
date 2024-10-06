import { NextFunction } from "express";
import * as _ from "lodash";
import express from "express";
import logger from "../logger";

function parseQuery(
  req: express.Request<any, any, any, Record<string, any>>,
  res: express.Response,
  next: NextFunction
) {
  for (const queryKey of Object.keys(req.query)) {
    if (req.query[queryKey] === "true" || req.query[queryKey] === "false") {
      req.query[queryKey] = Boolean(req.query[queryKey]);
    } else if (_.isInteger(req.query[queryKey])) {
      req.query[queryKey] = Number(req.query[queryKey]);
    }
  }

  next();
}

function handleError(
  err: any,
  req: express.Request,
  res: express.Response,
  next: NextFunction
) {
  const originalSend = res.send;

  res.send = (body: any) => {
    if (
      req.statusCode === 400 ||
      req.statusCode === 500 ||
      req.statusCode === 404 ||
      req.statusCode === 403 ||
      req.statusCode === 401 ||
      req.statusCode === 422
    ) {
      logger.error(`${req.originalUrl} ${res.statusCode}: ${req.method}`);

      logger.debug(`with data: ${JSON.stringify(req.body)}`);
    } else {
      logger.info(`${req.originalUrl} ${res.statusCode}: ${req.method}`);
    }

    return originalSend.call(res, body);
  };

  next();
}

export { parseQuery, handleError };
