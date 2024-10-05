import express from "express";

type Body<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
type BodyId = { id: string };
type PathId = { id: string };
type QueryParams = {
    limit: string;
    offset: string;
};

type FileUpload = {
    file: Express.Multer.File;
    [key: string]: any;
};

function formatBodyId(user: BodyId): string | undefined {
    let whereClause = undefined;

    if (user && user.id) {
        whereClause = user.id;
    }

    return whereClause;
}
/**
 * @openapi
 * components:
 *   schemas:
 *     APIResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     APIException:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *         originalError:
 *           type: error
 */
class APIException extends Error {
    public readonly status: number;
    public readonly data: any;
    public readonly originalError: Error | undefined;
    public readonly req: express.Request<
        any,
        any,
        any,
        any,
        Record<string, any>
    >;
    public readonly res: express.Response<any, Record<string, any>>;

    constructor(
        req: express.Request<any, any, any, any, Record<string, any>>,
        res: express.Response<any, Record<string, any>>,
        message: string,
        status: number,
        data?: any,
        originalError: Error | undefined = undefined
    ) {
        super(message);
        this.status = status;
        this.data = data;
        this.originalError = originalError;
        this.req = req;
        this.res = res;
    }
}
function requiredValue<ObjectData>(
    req: express.Request<any, any, any, ObjectData, Record<string, any>>,
    res: express.Response<any, Record<string, any>>,
    ...keys: (keyof ObjectData)[]
) {
    const body = req.query;

    keys.forEach((key) => {
        if (!body[key]) {
            throw new APIException(
                req,
                res,
                `Missing required body value ${String(key)}`,
                400,
                { body },
                undefined
            );
        }
    });
}

export {
    Body,
    BodyId,
    PathId,
    formatBodyId,
    FileUpload,
    QueryParams,
    requiredValue,
    APIException,
};
