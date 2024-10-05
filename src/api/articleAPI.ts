import { Article, Asset, OpinionType } from "@prisma/client";
import { APIRequest, IApi } from "../iapi";
import express from "express";
import {
    Body,
    formatBodyId,
    BodyId,
    requiredValue,
    PathId,
    QueryParams,
    FileUpload,
} from "../utils/apiUtils";
import { deleteFile, getImagePath } from "../utils/fsUtils";
import { success, APIException, Uploader } from "../utils/httpUtils";

// Define the structure for including related data in Article queries
interface ArticleInclude {
    author: boolean;
    opinions: boolean;
    assets: boolean;
}

type ArticleUpdateBody = Partial<
    Omit<Article, "id" | "createdAt" | "updatedAt" | "authorId">
>;

const route = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the user
 *         username:
 *           type: string
 *           description: The username of the user
 *         avatar:
 *           type: object
 *           description: The avatar of the user
 *     Article:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the article
 *         title:
 *           type: string
 *           description: The title of the article
 *         content:
 *           type: string
 *           description: The content of the article
 *         author:
 *           type: object
 *           description: The author of the article
 *         opinions:
 *           type: array
 *           description: The opinions of the article
 *           items:
 *             type: object
 *         likes:
 *           type: array
 *           description: The likes of the article
 *           items:
 *             type: object
 *
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Article:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The unique identifier for the article
 *         title:
 *           type: string
 *           description: The title of the article
 *         content:
 *           type: string
 *           description: The content of the article
 *         author:
 *           type: User
 *           description: The author of the article
 *         opinions:
 *           type: array
 *           description: The opinions of the article
 *           items:
 *             type: object
 *         likes:
 *           type: array
 *           description: The likes of the article
 *           items:
 *             type: object
 */

// ArticleAPI class extends IApi with specific types for Article operations
class ArticleAPI extends IApi<Article, ArticleInclude> {
    private _upload: Uploader<PathId, {}, FileUpload & ArticleInclude>;

    constructor() {
        super("/article");

        this._upload = new Uploader<PathId, {}, FileUpload & ArticleInclude>(
            "/assets/images/uploads",
            this.onCheck.bind(this),
            this.onUpdate.bind(this)
        );

        // Get all article from user
        this.router.get("/user/:id", this.readAllFromUser.bind(this));

        // Upload a file for a article
        this.router.post("/upload-file/:id", ...this._upload.array("articles"));

        // Create or change an opinion on an article
        this.router.post(
            "/:id/opinion/:userId",
            this.createOrChangeOpinion.bind(this)
        );

        this.router.delete(
            "/:id/opinion/:userId",
            this.deleteOpinion.bind(this)
        );
    }

    private async deleteOpinion(
        req: APIRequest<
            { id: string; userId: string },
            {},
            { article: boolean; user: boolean }
        >,
        res: express.Response
    ): Promise<void> {
        const opinions = await this.__prisma.opinion.delete({
            where: { articleId: req.params.id, userId: req.params.userId },
            include: req.query,
        });

        if (!opinions) {
            throw new APIException(
                req,
                res,
                "Opinion not found",
                404,
                { id: req.params.id, userId: req.params.userId },
                undefined
            );
        }

        success(res, opinions);
    }

    /**
     * @openapi
     * /article/{id}/opinion/{userId}:
     *   post:
     *     summary: Create or change an opinion on an article
     *     description: Create or change an opinion on an article
     *     parameters:
     *       - name: id
     *         in: path
     *       - name: userId
     *         in: path
     *       - name: opinion
     *         in: body
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: An opinion
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Opinion'
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *       500:
     *         description: Internal Server Error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     */
    private async createOrChangeOpinion(
        req: APIRequest<
            { id: string; userId: string },
            { opinion: string },
            {}
        >,
        res: express.Response
    ): Promise<void> {
        if (!req.body.opinion) {
            throw new APIException(
                req,
                res,
                "Field 'opinion' is required",
                400,
                req.body,
                undefined
            );
        }

        if (req.body.opinion !== "DISLIKE" && req.body.opinion !== "LIKE") {
            throw new APIException(
                req,
                res,
                "Wrong value for 'opinion'. Must be 'DISLIKE' or 'LIKE'",
                400,
                req.body,
                undefined
            );
        }

        const article = await this.__prisma.article.findUnique({
            where: {
                id: req.params.id,
            },
        });

        // Check if the article exists
        if (!article) {
            throw new APIException(
                req,
                res,
                "Article not found",
                404,
                req.body,
                undefined
            );
        }

        // Create or update an opinion for a user on an article
        await this.__prisma.opinion.upsert({
            where: {
                articleId: req.params.id,
                userId: req.params.userId,
            },
            create: {
                articleId: req.params.id,
                opinionType: req.body.opinion as OpinionType,
                userId: req.params.userId,
            },
            update: {
                opinionType: req.body.opinion as OpinionType,
            },
        });

        // If the article is found, return a success message
        success(res, article);
    }

    private async onCheck(
        req: APIRequest<PathId, {}, FileUpload & ArticleInclude>,
        res: express.Response
    ): Promise<Asset | null | Asset[]> {
        const article = await this.__prisma.article.findUnique({
            where: {
                id: req.params.id,
            },
            include: {
                assets: true,
            },
        });

        if (!article) {
            throw new APIException(
                req,
                res,
                "Article not found",
                404,
                req.body,
                undefined
            );
        }

        return article.assets;
    }

    private async onUpdate(
        req: APIRequest<PathId, {}, FileUpload & ArticleInclude>,
        res: express.Response
    ): Promise<Asset[]> {
        const reqFiles = req.files as Express.Multer.File[];

        const response = await Promise.all(
            reqFiles.map(async (file) => {
                return await this.__prisma.asset.create({
                    data: {
                        filename: file.filename,
                        path: file.path,
                        mimetype: file.mimetype,
                        size: file.size,
                        articleId: req.params.id,
                    },
                });
            })
        );

        return response;
    }

    private async readAllFromUser(
        req: APIRequest<PathId, {}, QueryParams & ArticleInclude>,
        res: express.Response
    ): Promise<void> {
        try {
            requiredValue(req, res, "limit", "offset");

            const limit = parseInt(req.query.limit);
            const offset = parseInt(req.query.offset);
            const author = Boolean(req.query.author);
            const opinions = Boolean(req.query.opinions);

            if (isNaN(limit)) {
                throw new APIException(
                    req,
                    res,
                    "Invalid parameters for limit. limit must be a number",
                    400,
                    undefined,
                    undefined
                );
            }

            if (isNaN(offset)) {
                throw new APIException(
                    req,
                    res,
                    "Invalid parameters for offset. offset must be a number",
                    400,
                    undefined,
                    undefined
                );
            }

            if (author && typeof author !== "boolean") {
                throw new APIException(
                    req,
                    res,
                    "Invalid parameters for author. author must be a boolean",
                    400,
                    undefined,
                    undefined
                );
            }

            const articles = await this.__prisma.article.findMany({
                include: {
                    author: author,
                    opinions: opinions,
                },
                take: limit,
                skip: offset,
                where: {
                    author: {
                        id: req.params.id,
                    },
                },
            });

            success(res, articles);
        } catch (e) {
            throw new APIException(
                req,
                res,
                "Internal server error",
                500,
                undefined,
                e as Error
            );
        }
    }

    /**
     * @openapi
     * /articles:
     *   get:
     *     summary: Retrieve a list of articles
     *     description: Retrieve a list of articles from the database
     *     parameters:
     *       - name: id
     *         in: query
     *         description: The ID of the user to retrieve articles for. If there is no user, return articles from all users
     *         schema:
     *           type: string
     *       - name: limit
     *         in: query
     *         required: true
     *         description: The number of articles to retrieve
     *         schema:
     *           type: integer
     *       - name: offset
     *         in: query
     *         required: true
     *         description: The number of articles to skip
     *         schema:
     *           type: integer
     *       - name: author
     *         in: query
     *         required: false
     *         description: Also retrieve the author of the article
     *         schema:
     *           type: boolean
     *       - name: opinions
     *         in: query
     *         required: false
     *         description: Also retrieve the opinions of the article
     *         schema:
     *           type: boolean
     *     responses:
     *       200:
     *         description: A list of articles
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   value: "Success"
     *                 data:
     *                   type: object
     *                   properties:
     *                     articles:
     *                       type: array
     *                       items:
     *                         $ref: '#/components/schemas/Article'
     *       500:
     *         description: Internal Server Error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Internal Server Error"
     *                 status: 500
     *                 data: {}
     *                 originalError: {}
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Invalid parameters for limit. limit must be a number"
     *                 status: 400
     *                 data: {}
     *                 originalError: {}
     */
    async readAll(
        req: APIRequest<{}, {}, QueryParams & ArticleInclude>,
        res: express.Response
    ): Promise<void> {
        try {
            requiredValue(req, res, "limit", "offset");

            const limit = parseInt(req.query.limit);
            const offset = parseInt(req.query.offset);
            const author = Boolean(req.query.author);
            const opinions = Boolean(req.query.opinions);

            if (isNaN(limit)) {
                throw new APIException(
                    req,
                    res,
                    "Invalid parameters for limit. limit must be a number",
                    400,
                    undefined,
                    undefined
                );
            }

            if (isNaN(offset)) {
                throw new APIException(
                    req,
                    res,
                    "Invalid parameters for offset. offset must be a number",
                    400,
                    undefined,
                    undefined
                );
            }

            if (author && typeof author !== "boolean") {
                throw new APIException(
                    req,
                    res,
                    "Invalid parameters for author. author must be a boolean",
                    400,
                    undefined,
                    undefined
                );
            }

            if (opinions && typeof opinions !== "boolean") {
                throw new APIException(
                    req,
                    res,
                    "Invalid parameters for opinions. opinions must be a boolean",
                    400,
                    undefined,
                    undefined
                );
            }

            // Fetch all articles with optional inclusion of author and likes
            const articles = await this.__prisma.article.findMany({
                include: {
                    author: author,
                    opinions: opinions,
                },
                take: limit,
                skip: offset,
            });

            success(res, articles);
        } catch (e) {
            throw new APIException(
                req,
                res,
                "Internal server error",
                500,
                undefined,
                e as Error
            );
        }
    }

    /**
     * @openapi
     * /article/{id}:
     *   get:
     *     summary: Retrieve an article by ID
     *     description: Retrieve an article by ID from the database
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: An article
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIResponse'
     *             example:
     *               value:
     *                 message: "Success"
     *                 data:
     *                   article:
     *                     - id: "1"
     *                       title: "Article 1"
     *                       content: "Content 1"
     *                       author:
     *                         id: "1"
     *       500:
     *         description: Internal Server Error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Internal Server Error"
     *                 status: 500
     *                 data: {}
     *                 originalError: {}
     *       404:
     *         description: Article not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Article not found"
     *                 status: 404
     *                 data: { id: "1" }
     *                 originalError: {}
     */
    async read(
        req: APIRequest<PathId, {}, ArticleInclude>,
        res: express.Response
    ): Promise<void> {
        try {
            // Fetch a single article by ID with optional inclusion of author and likes
            const article = await this.__prisma.article.findUnique({
                where: { id: req.params.id },
                include: req.query,
            });

            if (!article) {
                throw new APIException(
                    req,
                    res,
                    "Article not found",
                    404,
                    { id: req.params.id },
                    undefined
                );
            }

            success(res, article);
        } catch (e) {
            throw new APIException(
                req,
                res,
                "Internal server error",
                500,
                { id: req.params.id },
                e as Error
            );
        }
    }

    /**
     * @openapi
     * /article:
     *   post:
     *     summary: Create a new article
     *     description: Create a new article in the database
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/Article'
     *     responses:
     *       200:
     *         description: Article created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIResponse'
     *             example:
     *               value:
     *                 message: "Success"
     *                 data:
     *                   article:
     *                     - id: "1"
     *                       title: "Article 1"
     *                       content: "Content 1"
     *                       author:
     *                         id: "1"
     *       500:
     *         description: Internal Server Error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Internal Server Error"
     *                 status: 500
     *                 data: {}
     *                 originalError: {}
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Article not created"
     *                 status: 400
     *                 data: {}
     *                 originalError: {}
     */
    async create(
        req: APIRequest<{}, Body<Article>, ArticleInclude>,
        res: express.Response
    ): Promise<void> {
        try {
            // Create a new article with the provided data
            const article = await this.__prisma.article.create({
                data: req.body,
                include: req.query,
            });

            if (!article) {
                throw new APIException(
                    req,
                    res,
                    "Article not created",
                    400,
                    { article: req.body },
                    undefined
                );
            }

            success(res, article);
        } catch (e) {
            throw new APIException(
                req,
                res,
                "Internal server error",
                500,
                { article: req.body },
                e as Error
            );
        }
    }

    /**
     * @openapi
     * /article/{id}:
     *   put:
     *     summary: Update an article by ID
     *     description: Update an article by ID in the database
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               content:
     *                 type: string
     *     responses:
     *       200:
     *         description: Article updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIResponse'
     *             example:
     *               value:
     *                 message: "Success"
     *                 data:
     *                   article:
     *                     - id: "1"
     *                       title: "Updated Article 1"
     *                       content: "Updated Content 1"
     *                       author:
     *                         id: "1"
     *       500:
     *         description: Internal Server Error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Internal Server Error"
     *                 status: 500
     *                 data: {}
     *                 originalError: {}
     *       404:
     *         description: Article not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Article not found"
     *                 status: 404
     *                 data: { id: "1" }
     *                 originalError: {}
     */
    async update(
        req: APIRequest<PathId, ArticleUpdateBody, ArticleInclude>,
        res: express.Response
    ): Promise<void> {
        try {
            // Update an article by ID with the provided data
            const article = await this.__prisma.article.update({
                where: { id: req.params.id },
                data: req.body,
                include: req.query,
            });

            // If the article is not found, throw an error
            if (!article) {
                throw new APIException(
                    req,
                    res,
                    "Article not found",
                    404,
                    { id: req.params.id },
                    undefined
                );
            }

            // If the article is found, return a success message
            success(res, article);
        } catch (e) {
            // If an error occurs, throw an APIException
            throw new APIException(
                req,
                res,
                "Internal server error",
                500,
                { id: req.params.id, article: req.body },
                e as Error
            );
        }
    }

    /**
     * @openapi
     * /article/{id}:
     *   delete:
     *     summary: Delete an article by ID
     *     description: Delete an article by ID in the database
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Article deleted successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIResponse'
     *             example:
     *               value:
     *                 message: "Success"
     *                 data:
     *                   article:
     *                     - id: "1"
     *                       title: "Article 1"
     *                       content: "Content 1"
     *                       author:
     *                         id: "1"
     *       500:
     *         description: Internal Server Error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Internal Server Error"
     *                 status: 500
     *                 data: {}
     *                 originalError: {}
     *       404:
     *         description: Article not found
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Article not found"
     *                 status: 404
     *                 data: { id: "1" }
     *                 originalError: {}
     *       400:
     *         description: Bad Request
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/APIException'
     *             example:
     *               value:
     *                 message: "Bad Request"
     *                 status: 400
     */
    async delete(
        req: APIRequest<PathId, {}, Omit<ArticleInclude, "assets">>,
        res: express.Response
    ): Promise<void> {
        try {
            // Delete an article by ID
            const article = await this.__prisma.article.delete({
                where: { id: req.params.id },
                include: {
                    ...req.query,
                    assets: true,
                },
            });

            // If the article is not found, throw an error
            if (!article) {
                throw new APIException(
                    req,
                    res,
                    "Article not found",
                    404,
                    { id: req.params.id },
                    undefined
                );
            }

            // If the article is found, return a success message
            success(res, article);
        } catch (e) {
            // If an error occurs, throw an APIException
            throw new APIException(
                req,
                res,
                "Internal server error",
                500,
                { id: req.params.id },
                e as Error
            );
        }
    }
}

export default ArticleAPI;
