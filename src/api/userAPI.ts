import { Prisma, User } from "@prisma/client";
import { APIException, IApi, APIRequest } from "../iapi";
import express from "express";
import settings from "../settings";
import { IDQuery, Body } from "../helpers/apiHelper";

// Define the structure for including related data in User queries
interface UserInclude {
    articles: boolean,
    opinions: boolean
}

// UserAPI class extends IApi with specific types for User operations
class UserAPI extends IApi {
    constructor() {
        super("/user");
    }

    // Read all users
    async readAll(req: APIRequest<{}, UserInclude>, res: express.Response): Promise<void> {
        if (settings.nodeEnv === "development") {
            try {
                // Fetch all users with optional inclusion of articles and likes
                const users = await this.__prisma.user.findMany({
                    include: {
                        articles: req.query.articles,
                        opinions: req.query.opinions
                    }
                });

                this.success(res, users);
            } catch(e) {
                throw new APIException("Internal server error", 500, undefined, e);
            }
        }

        res.status(404)
    }

    // Read a single user by ID
    async read(req: APIRequest<{}, IDQuery<UserInclude>>, res: express.Response): Promise<void> {
        try {
            // Fetch a single user by ID with optional inclusion of articles and likes
            const user = await this.__prisma.user.findUnique({
                where: { id: req.query.id },
                include: {
                    articles: req.query.articles,
                    opinions: req.query.opinions
                }
            });
            
            this.success(res, user);
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id }, e);
        }
    }

    // Create a new user
    async create(req: APIRequest<Body<User>, UserInclude>, res: express.Response): Promise<void> {
        try {
            // Create a new user with the provided data
            const user = await this.__prisma.user.create({
                data: req.body,
                include: {
                    articles: req.query.articles,
                    opinions: req.query.opinions
                }
            });

            this.success(res, user);
        } catch(e) {
            if(e instanceof Prisma.PrismaClientKnownRequestError) {
                switch(e.code) {
                    case "P2002":
                        throw new APIException("User with this email already exists", 400, { user: req.body }, e);
                    default:
                        throw new APIException("Internal server error", 500, { user: req.body }, e);
                }
            }
            throw new APIException("Internal server error", 500, { user: req.body }, e);
        }
    }

    // Update an existing user
    async update(req: APIRequest<Partial<Body<User>>, IDQuery<UserInclude>>, res: express.Response): Promise<void> {
        try {
            // Update a user by ID with the provided data
            const user = await this.__prisma.user.update({
                where: { id: req.query.id },
                data: req.body,
                include: {
                    articles: req.query.articles,
                    opinions: req.query.opinions
                }
            });
            
            this.success(res, user);
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id, user: req.body }, e);
        }
    }

    // Delete a user
    async delete(req: APIRequest<{}, IDQuery<UserInclude>>, res: express.Response): Promise<void> {
        try {
            // Delete a user by ID
            await this.__prisma.user.delete({
                where: { id: req.query.id },
                include: {
                    articles: req.query.articles,
                    opinions: req.query.opinions
                }
            });

            this.success(res, { id: req.query.id });
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id }, e);
        }
    }
}

export default UserAPI;