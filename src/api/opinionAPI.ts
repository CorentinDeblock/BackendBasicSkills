import { Opinion, Prisma } from "@prisma/client";
import { APIException } from "../iapi";
import { APIRequest, IApi } from "../iapi";
import { Response } from "express";
import { IDQuery, Body } from "../helpers/apiHelper";

interface OpinionInclude {
    user: boolean
    article: boolean
}

class OpinionAPI extends IApi {
    async readAll(req: APIRequest<{}, OpinionInclude>, res: Response): Promise<void> {
        try {
            const opinions = await this.__prisma.opinion.findMany({
                include: {
                    user: req.query.user,
                    article: req.query.article
                }
            });

            this.success(res, opinions);
        } catch(e) {
            throw new APIException("Internal server error", 500, undefined, e);
        }
    }

    async read(req: APIRequest<{}, IDQuery<OpinionInclude>>, res: Response): Promise<void> {
        try {
            const opinion = await this.__prisma.opinion.findUnique({
                where: { id: req.query.id },
                include: {
                    user: req.query.user,
                    article: req.query.article
                }
            });

            this.success(res, opinion);
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id }, e);
        }
    }

    async create(req: APIRequest<Body<Opinion>, OpinionInclude>, res: Response): Promise<void> {
        try {
            const opinion = await this.__prisma.opinion.create({
                data: req.body,
                include: {
                    user: req.query.user,
                    article: req.query.article
                }
            });

            this.success(res, opinion);
        } catch(e) {
            if(e instanceof Prisma.PrismaClientKnownRequestError) {
                switch(e.code) {
                    case "P2002":
                        throw new APIException("Opinion already exists", 400, { opinion: req.body }, e);
                    default:
                        throw new APIException("Internal server error", 500, { opinion: req.body }, e);
                }
            }
            throw new APIException("Internal server error", 500, { opinion: req.body }, e);
        }
    }

    async update(req: APIRequest<Partial<Body<Opinion>>, IDQuery<OpinionInclude>>, res: Response): Promise<void> {
        try {
            const opinion = await this.__prisma.opinion.update({
                where: { id: req.query.id },
                data: req.body,
                include: {
                    user: req.query.user,
                    article: req.query.article
                }
            });

            this.success(res, opinion);
        }
        catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id, opinion: req.body }, e);
        }
    }

    async delete(req: APIRequest<{}, IDQuery<OpinionInclude>>, res: Response): Promise<void> {
        try {
            await this.__prisma.opinion.delete({
                where: { id: req.query.id },
                include: {
                    user: req.query.user,
                    article: req.query.article
                }
            });
            
            this.success(res, { id: req.query.id });
        }
        catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id }, e);
        }
    }

    constructor() {
        super("/opinion");
    }
}

export default OpinionAPI;