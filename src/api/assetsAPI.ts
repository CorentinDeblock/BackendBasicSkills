import { APIException, APIRequest, IApi } from "../iapi";
import { Asset, Prisma } from "@prisma/client";
import express from "express";
import { IDQuery, Body } from "../helpers/apiHelper";
import settings from "../settings";

class FileAPI extends IApi {
    async readAll(req: APIRequest<{}, {}>, res: express.Response): Promise<void> {
        if(settings.nodeEnv === "development") {
            try {
                const files = await this.__prisma.asset.findMany();
                this.success(res, files);
            } catch(e) {
                throw new APIException("Internal server error", 500, undefined, e);
            }
        }
    }

    async read(req: APIRequest<{}, { id: string }>, res: express.Response): Promise<void> {
        try {
            const file = await this.__prisma.asset.findUnique({
                where: { id: req.query.id }
            });
            this.success(res, file);
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id }, e);
        }
    }

    async create(req: APIRequest<Body<Asset>, {}>, res: express.Response): Promise<void> {
        try {
            const file = await this.__prisma.asset.create({
                data: req.body
            });
            this.success(res, file);
        } catch(e) {
            throw new APIException("Internal server error", 500, { file: req.body }, e);
        }
    }

    async update(req: APIRequest<Partial<Body<Asset>>, { id: string }>, res: express.Response): Promise<void> {
        try {
            const file = await this.__prisma.asset.update({
                where: { id: req.query.id },
                data: req.body
            });
            this.success(res, file);
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id, file: req.body }, e);
        }
    }

    async delete(req: APIRequest<{}, { id: string }>, res: express.Response): Promise<void> {
        try {
            await this.__prisma.asset.delete({
                where: { id: req.query.id }
            });
            this.success(res, { id: req.query.id });
        } catch(e) {
            throw new APIException("Internal server error", 500, { id: req.query.id }, e);
        }
    }

    constructor() {
        super("/file");
    }
}

export default FileAPI;