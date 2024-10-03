import { Article, User } from "@prisma/client";
import { APIException, APIRequest, IApi } from "../iapi";
import express from "express";
import { IDQuery, Body } from "../helpers/apiHelper";

// Define the structure for including related data in Article queries
interface ArticleInclude {      
    author: boolean,
    opinions: boolean
}

interface ArticleQueryParams {
    limit: number
    offset: number
}

// ArticleAPI class extends IApi with specific types for Article operations
class ArticleAPI extends IApi {
    constructor() {
        super("/article");
    }

    // Read all articles
    async readAll(req: APIRequest<{}, ArticleQueryParams & ArticleInclude>, res: express.Response): Promise<void> {
        try {
            // Fetch all articles with optional inclusion of author and likes
            const articles = await this.__prisma.article.findMany({
                include: {
                    author: req.query.author,
                    opinions: req.query.opinions
                },
                take: req.query.limit,
                skip: req.query.offset
            });

            this.success(res, articles);
        } catch(e) {
            throw new APIException("Internal server error", 500, undefined, e);
        }
    }

    // Read a single article by ID
    async read(req: APIRequest<{}, IDQuery<ArticleInclude>>, res: express.Response): Promise<void> {
        try {
            // Fetch a single article by ID with optional inclusion of author and likes
            const article = await this.__prisma.article.findUnique({
                where: { id: req.query.id },
                include: {
                    author: req.query.author,
                    opinions: req.query.opinions
                }
            });
            
            this.success(res, article);
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id }, e);
        }
    }

    // Create a new article
    async create(req: APIRequest<Body<Article>, ArticleInclude>, res: express.Response): Promise<void> {
        try {
            // Create a new article with the provided data
            const article = await this.__prisma.article.create({
                data: req.body,
                include: {
                    author: req.query.author,
                    opinions: req.query.opinions
                }
            });

            this.success(res, article);
        } catch(e) {
            throw new APIException("Internal server error", 500, { article: req.body }, e);
        }
    }

    // Update an existing article
    async update(req: APIRequest<{}, IDQuery<ArticleInclude>>, res: express.Response): Promise<void> {
        try {
            // Update an article by ID with the provided data
            const article = await this.__prisma.article.update({
                where: { id: req.query.id },
                data: req.body,
                include: {
                    author: req.query.author,
                    opinions: req.query.opinions
                }
            });
            
            this.success(res, article);
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id, article: req.body }, e);
        }
    }

    // Delete an article
    async delete(req: APIRequest<{}, IDQuery<ArticleInclude>>, res: express.Response): Promise<void> {
        try {
            // Delete an article by ID
            await this.__prisma.article.delete({
                where: { id: req.query.id },
                include: {
                    author: req.query.author,
                    opinions: req.query.opinions
                }
            });

            this.success(res, { id: req.query.id });
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id }, e);
        }
    }
}

export default ArticleAPI;