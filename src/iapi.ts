import { NextFunction, Request, Response } from "express";
import express from "express";
import { PrismaClient } from "@prisma/client";
import Logger from "./logger";
import Settings from "./settings";
import { PathId, Body } from "./utils/apiUtils";
import _ from "lodash";

type SpecialPathMethod = "get" | "post" | "put" | "delete";
type SpecialPathCallback = (
    req: express.Request<any, any, any, any, Record<string, any>>,
    res: express.Response<any, Record<string, any>>
) => Promise<void>;

interface SpecialPath {
    method: SpecialPathMethod;
    callback: SpecialPathCallback;
    middleware?: express.RequestHandler<
        any,
        any,
        any,
        any,
        Record<string, any>
    >;
    includeParentPath: boolean;
}

type APIRequest<
    PathParams extends { [key: string]: any },
    BodyType extends { [key: string]: any },
    QueryParams extends { [key: string]: any }
> = Request<PathParams, {}, BodyType, QueryParams>;

abstract class IApi<
    BodyType extends { [key: string]: any },
    QueryType extends { [key: string]: any }
> {
    public readonly path: string;

    protected readonly __prisma: PrismaClient = new PrismaClient();

    private _router: express.Router = express.Router();

    get router() {
        return this._router;
    }

    /** Constructor of the API class
     * Logs the connection status of the Prisma client for this route
     *
     * @param path The path of the route (e.g. /user)
     * @param params The parameters of the route (e.g. /:id)
     */
    constructor(path: string) {
        this.path = path;

        Logger.debug(
            this.__prisma
                ? `Prisma client connected for ${this.path}`
                : `Prisma client not connected for ${this.path}`
        );

        this.router
            .get("s", this.readAll.bind(this))
            .get("/:id", this.read.bind(this))
            .post("", this.create.bind(this))
            .put("/:id", this.update.bind(this))
            .delete("/:id", this.delete.bind(this));
    }

    /**
     * Reads all the data from the database
     * Need to be defined by the child class
     *
     * @param req The request object
     * @param res The response object
     */
    abstract readAll(
        req: APIRequest<{}, {}, QueryType>,
        res: Response
    ): Promise<void>;

    /**
     * Reads a single item from the database
     * Need to be defined by the child class
     *
     * @param req The request object
     * @param res The response object
     */
    abstract read(
        req: APIRequest<PathId, {}, QueryType>,
        res: Response
    ): Promise<void>;

    /**
     * Creates a new item in the database
     * Need to be defined by the child class
     *
     * @param req The request object
     * @param res The response object
     */
    abstract create(
        req: APIRequest<{}, Body<BodyType>, QueryType>,
        res: Response
    ): Promise<void>;

    /**
     * Updates an item in the database
     * Need to be defined by the child class
     *
     * @param req The request object
     * @param res The response object
     */
    abstract update(
        req: APIRequest<PathId, Partial<Body<BodyType>>, QueryType>,
        res: Response
    ): Promise<void>;

    /**
     * Deletes an item from the database
     * Need to be defined by the child class
     *
     * @param req The request object
     * @param res The response object
     */
    abstract delete(
        req: APIRequest<PathId, {}, QueryType>,
        res: Response
    ): Promise<void>;
}

type IApiDefault = IApi<any, any>;

class API {
    private _iapis: IApiDefault[] = [];

    /**
     * Adds an API route to the API class
     *
     * @param api The API to add
     * @returns The API class
     */
    addAPI(api: IApiDefault) {
        this._iapis.push(api);
        return this;
    }

    /**
     * Applies all API routes to a router for express to handle
     *
     * @returns The router with the API routes
     */
    apply() {
        const router = express.Router();

        // Merge all the routes of the API with the main router
        this._iapis.forEach((api) => {
            router.use(api.path, api.router);
        });

        return router;
    }
}

export { IApi, API, APIRequest, SpecialPath };
