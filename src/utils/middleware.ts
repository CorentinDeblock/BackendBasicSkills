import { NextFunction } from "express";
import * as _ from "lodash";
import express from "express";

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

export { parseQuery };
