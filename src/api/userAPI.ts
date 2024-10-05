import { Asset, PrismaClient, User } from "@prisma/client";
import express from "express";
import { Uploader } from "../utils/httpUtils";
import { deleteFile, getImagePath } from "../utils/fsUtils";
import logger from "../logger";

const router = express.Router();
const prisma = new PrismaClient();

type UserBody = Omit<User, "id">;

interface UserInclude {
    articles: boolean;
    opinions: boolean;
    avatar: boolean;
}

type RequestUserBody = express.Request<{}, {}, UserBody, UserInclude>;
type RequestUserQuery = express.Request<{ id: string }, {}, {}, UserInclude>;

function convertQueryToInclude(
    req: express.Request<any, any, any, UserInclude>
): UserInclude {
    return {
        articles: Boolean(req.query.articles),
        opinions: Boolean(req.query.opinions),
        avatar: Boolean(req.query.avatar),
    };
}

async function onCheck(
    req: express.Request,
    _: express.Response
): Promise<Asset | Asset[] | null> {
    const file = await prisma.asset.findUnique({
        where: {
            userId: req.params.id,
        },
    });

    return file;
}

async function onUpdate(
    req: express.Request<{ id: string }, {}, {}>,
    _: express.Response
): Promise<Asset> {
    const file = await prisma.asset.upsert({
        where: {
            userId: req.params.id,
        },
        update: {
            filename: req.file!.filename,
            path: req.file!.path,
            mimetype: req.file!.mimetype,
            size: req.file!.size,
        },
        create: {
            filename: req.file!.filename,
            path: req.file!.path,
            mimetype: req.file!.mimetype,
            size: req.file!.size,
            userId: req.params.id,
        },
    });

    return file;
}

const uploader = new Uploader(
    "/assets/images/avatars",
    onCheck.bind(this),
    onUpdate.bind(this)
);

router.post("/upload-avatar/:id", ...uploader.single("avatar"));

router.get("/:id", async (req: RequestUserQuery, res: express.Response) => {
    if (req.params.id === undefined) {
        res.status(400).json({ message: "User id is required" });
        return;
    }

    const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        include: convertQueryToInclude(req),
    });

    if (user === null) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    res.json({ message: "Success", data: user });
});

router.post("/", async (req: RequestUserBody, res: express.Response) => {
    try {
        const user = await prisma.user.create({
            data: req.body,
            include: convertQueryToInclude(req),
        });

        if (user === null) {
            res.status(400).json({ message: "User not created" });
            return;
        }

        res.status(201).json({ message: "Success", data: user });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

router.put("/:id", async (req: RequestUserQuery, res: express.Response) => {
    if (req.params.id === undefined) {
        res.status(400).json({ message: "User id is required" });
        return;
    }

    const user = await prisma.user.update({
        where: { id: req.params.id },
        data: req.body,
        include: convertQueryToInclude(req),
    });

    if (user === null) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    res.json({ message: "Success", data: user });
});

router.delete("/:id", async (req: RequestUserQuery, res: express.Response) => {
    if (req.params.id === undefined) {
        res.status(400).json({ message: "User id is required" });
        return;
    }

    const user = await prisma.user.delete({
        where: { id: req.params.id },
        include: {
            avatar: true,
        },
    });

    if (user === null) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    if (user.avatar !== null) {
        logger.info(`Deleting avatar ${user.avatar.filename}`);

        await deleteFile(getImagePath("avatars", user.avatar.filename));
    }

    res.json({ message: "Success" });
});

export default router;
