import { Request, Response } from 'express';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import Logger from './logger';
import Settings from './settings';

class APIException extends Error {
    public readonly status: number;
    public readonly data: any;
    public readonly originalError: unknown | undefined;

    constructor(message: string, status: number, data?: any, originalError: unknown = undefined) {
        super(message);
        this.status = status;
        this.data = data;
        this.originalError = originalError;
    }
}

type APIRequest<
    BodyType extends { [key: string]: any }, 
    QueryParams extends { [key: string]: any }
> = Request<{}, {}, BodyType, QueryParams>;

abstract class IApi {
    public readonly path: string;

    protected readonly __prisma: PrismaClient = new PrismaClient();

    /** Constructor of the API class
     * Logs the connection status of the Prisma client for this route
     * 
     * @param path The path of the route (e.g. /user)
     * @param params The parameters of the route (e.g. /:id)
     */
    constructor(path: string) {
        this.path = path;

        if(Settings.verbose) {
            Logger.info(this.__prisma ? `Prisma client connected for ${this.path}` : `Prisma client not connected for ${this.path}`);
        }
    }

    /**
     * Sends a success response to the client
     * 
     * @param res The response object
     * @param data The data to send to the client (log only if env LOG_DATA is true)
     */
    protected success(res: Response, data: any) {
        res.status(200).json(data);

        Logger.info(`${res.req.path} ${res.statusCode}: ${res.req.method}`);
        
        if(Settings.logData) {
            Logger.info(`${JSON.stringify(data)}`);
        }
    }

    /**
     * Reads all the data from the database
     * Need to be defined by the child class
     * 
     * @param req The request object
     * @param res The response object
     */
    abstract readAll(req: APIRequest<{}, {}>, res: Response): Promise<void>;
        
    /**
     * Reads a single item from the database
     * Need to be defined by the child class
     * 
     * @param req The request object
     * @param res The response object
     */
    abstract read(req: APIRequest<{}, {}>, res: Response): Promise<void>;

    /**
     * Creates a new item in the database
     * Need to be defined by the child class
     * 
     * @param req The request object
     * @param res The response object
     */
    abstract create(req: APIRequest<{}, {}>, res: Response): Promise<void>;

    /**
     * Updates an item in the database
     * Need to be defined by the child class
     * 
     * @param req The request object
     * @param res The response object
     */
    abstract update(req: APIRequest<{}, {}>, res: Response): Promise<void>;
    
    /**
     * Deletes an item from the database
     * Need to be defined by the child class
     * 
     * @param req The request object
     * @param res The response object
     */
    abstract delete(req: APIRequest<{}, {}>, res: Response): Promise<void>;
}

class API {
    private _iapis: IApi[] = [];

    /**
     * Adds an API route to the API class
     * 
     * @param api The API to add
     * @returns The API class
     */
    addAPI(api: IApi) {
        this._iapis.push(api);
        return this;
    }

    /**
     * Handles the API path with the given callback
     * This will catch any APIException and send the error to the client without exposing sensitive information
     * 
     * @param api The API to handle
     * @param callback The callback to handle the API path
     * @returns A function that handles the API path
     */
    private handleAPIPath(api: IApi, callback: (req: Request, res: Response) => Promise<void>) {
        return async (req: Request, res: Response) => {
            try {
                await callback.bind(api)(req, res);
            } catch(e) {
                if(e instanceof APIException) {
                    res.status(e.status).json({
                        message: e.message,
                        data: e.data
                    });

                    // Log the error
                    Logger.error(`${req.path} ${e.status}: ${req.method} ${req.body} ${e.message}`);
                    
                    // Log the original error if it exists
                    if(e.originalError !== undefined && Settings.verbose) {
                        Logger.error(`Original error: ${e.originalError}`);
                    }

                    // Log the data if the env LOG_DATA is true
                    if(e.data !== undefined && Settings.logData) {
                        Logger.error(`with data: ${JSON.stringify(e.data)}`);
                    }
                }
            }
        }
    }

    /**
     * Applies all API routes to a router for express to handle
     * 
     * @returns The router with the API routes
     */
    apply() {
        const router = express.Router();
        
        // Iterate over all APIs routes
        this._iapis.forEach((api) => {
            // Apply the routes to the router
            router
                .get(`${api.path}s`, this.handleAPIPath(api, api.readAll))
                .get(`${api.path}`, this.handleAPIPath(api, api.read))
                .post(`${api.path}}`, this.handleAPIPath(api, api.create))
                .put(`${api.path}`, this.handleAPIPath(api, api.update))
                .delete(`${api.path}`, this.handleAPIPath(api, api.delete));
        });

        return router;
    }
}

export { IApi, API, APIException, APIRequest };
