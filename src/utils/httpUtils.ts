import path from "path";
import fs, { mkdir } from "fs";
import https from "https";
import multer, { diskStorage } from "multer";
import { randomUUID } from "crypto";
import express, { Router } from "express";
import { APIRequest } from "../iapi";
import { deleteFile, getImagePath, getProjectRoot } from "./fsUtils";
import { Asset, PrismaClient } from "@prisma/client";
import logger from "../logger";
import { APIException, QueryParams } from "./apiUtils";

function downloadImage(
    width: number,
    height: number,
    filename: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = `https://picsum.photos/${width}/${height}`;

        const directory = path.join(__dirname, "temp");
        const filepath = path.join(directory, filename);

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }

        https
            .get(url, (response) => {
                // Handle redirects
                if (response.statusCode === 302) {
                    https
                        .get(
                            response.headers.location!,
                            (redirectedResponse) => {
                                const fileStream =
                                    fs.createWriteStream(filepath);
                                redirectedResponse.pipe(fileStream);

                                fileStream.on("finish", () => {
                                    fileStream.close();
                                    resolve(filepath);
                                });
                            }
                        )
                        .on("error", reject);
                } else if (response.statusCode === 200) {
                    const fileStream = fs.createWriteStream(filepath);
                    response.pipe(fileStream);

                    fileStream.on("finish", () => {
                        fileStream.close();
                        resolve(filepath);
                    });
                } else {
                    reject(
                        new Error(
                            `Unexpected status code: ${response.statusCode}`
                        )
                    );
                }
            })
            .on("error", reject);
    });
}

function deleteTempDirectory() {
    fs.rmSync(path.join(__dirname, "temp"), {
        recursive: true,
        force: true,
    });
}

/**
 * Sends a success response to the client
 *
 * @param res The response object
 * @param data The data to send to the client (log only if env LOG_DATA is true)
 */
function success(
    res: express.Response,
    data: any,
    message: string = "Success"
) {
    res.status(200).json({
        message,
        data: data,
        code: 200,
    });

    logger.info(`${res.req.originalUrl} ${res.statusCode}: ${res.req.method}`);
    logger.debug(`${JSON.stringify(data)}`);
}

type LoaderCallback<T> = (
    req: APIRequest<any, any, any>,
    res: express.Response
) => Promise<T>;

type OnCheckCallback = LoaderCallback<Asset | Asset[] | null>;
type OnUpdateCallback = LoaderCallback<any>;

class Uploader {
    private _upload: multer.Multer;
    private _dirpath: string;
    private _onCheck: OnCheckCallback;
    private _onUpdate: OnUpdateCallback;

    constructor(
        dirpath: string,
        onCheck: OnCheckCallback,
        onUpdate: OnUpdateCallback
    ) {
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, path.join(getProjectRoot(), dirpath));
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + "-" + randomUUID();
                cb(
                    null,
                    file.fieldname +
                        "-" +
                        uniqueSuffix +
                        path.extname(file.originalname)
                );
            },
        });

        this._upload = multer({ storage });
        this._dirpath = dirpath;
        this._onCheck = onCheck;
        this._onUpdate = onUpdate;
    }

    single(fieldname: string) {
        return [
            this.handleSingleMiddleware(fieldname),
            this.handleUpload.bind(this),
        ];
    }

    array(fieldname: string, maxCount?: number) {
        return [
            this.handleArrayMiddleware(fieldname, maxCount),
            this.handleArrayUpload.bind(this),
        ];
    }

    private handleSingleMiddleware(fieldname: string) {
        return (
            req: express.Request,
            res: express.Response,
            next: express.NextFunction
        ) => {
            this._upload.single(fieldname)(req, res, (err) => {
                logger.debug(err);
                next();
            });
        };
    }

    private handleArrayMiddleware(fieldname: string, maxCount?: number) {
        return (
            req: express.Request,
            res: express.Response,
            next: express.NextFunction
        ) => {
            this._upload.array(fieldname, maxCount)(req, res, (err) => {
                logger.debug(err);
                next();
            });
        };
    }

    private handleUpload = async (
        req: express.Request,
        res: express.Response
    ) => {
        if (!req.file) {
            throw new APIException(
                req,
                res,
                "No file uploaded",
                400,
                { file: req.file },
                undefined
            );
        }

        const fileCheck = await this._onCheck(req, res);

        if (fileCheck) {
            if (!Array.isArray(fileCheck)) {
                await this.handleFile(req, res, fileCheck);
            }
        }

        success(res, await this._onUpdate(req, res));
    };

    private handleArrayUpload = async (
        req: express.Request,
        res: express.Response
    ) => {
        if (!req.files || req.files.length === 0) {
            throw new APIException(
                req,
                res,
                "No file uploaded",
                400,
                { files: req.files },
                undefined
            );
        }

        const fileCheck = await this._onCheck(req, res);

        if (fileCheck) {
            if (Array.isArray(fileCheck)) {
                fileCheck.forEach(async (file) => {
                    await this.handleFile(req, res, file);
                });
            }
        }

        success(res, await this._onUpdate(req, res));
    };

    private async handleFile(
        req: express.Request,
        res: express.Response,
        fileCheck: Asset
    ) {
        const filepath = path.join(
            getProjectRoot(),
            this._dirpath,
            fileCheck.filename
        );

        if (fs.existsSync(filepath)) {
            try {
                await deleteFile(filepath);
            } catch (e) {
                throw new APIException(
                    req,
                    res,
                    "Internal server error",
                    500,
                    { filepath },
                    e as Error
                );
            }
        }
    }
}

export { downloadImage, deleteTempDirectory, success, Uploader, APIException };
