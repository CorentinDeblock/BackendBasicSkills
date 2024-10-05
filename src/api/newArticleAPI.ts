import { Article, PrismaClient } from "@prisma/client";
import express from "express";

const router = express.Router();
const prisma = new PrismaClient();

interface ArticleInclude {
    author: boolean;
    options: boolean;
    assets: boolean;
}

type RawArticleInclude = {
    [key in keyof ArticleInclude]: string;
};

type RequestWithInclude = express.Request<{}, {}, {}, RawArticleInclude>;
type RequestWithBody = express.Request<
    { userId: string },
    {},
    Omit<Article, "id" | "authorId" | "createdAt" | "updatedAt">,
    RawArticleInclude
>;
type RequestWithParams = express.Request<
    { id: string },
    {},
    {},
    RawArticleInclude
>;

function parseIncludeQuery(query: RawArticleInclude): ArticleInclude {
    const include: ArticleInclude = {
        author: query.author === "true" ? true : false,
        options: query.options === "true" ? true : false,
        assets: query.assets === "true" ? true : false,
    };
    return include;
}

router.get("/", async (req: RequestWithInclude, res: express.Response) => {
    const articles = await prisma.article.findMany({
        include: parseIncludeQuery(req.query),
    });
    res.json(articles);
});

router.get("/:id", async (req: express.Request, res: express.Response) => {
    const { id } = req.params;

    const article = await prisma.article.findUnique({
        where: { id },
        include: parseIncludeQuery(req.query as RawArticleInclude),
    });

    if (!article) {
        res.status(404).json({ message: "Article not found" });
        return;
    }

    res.json(article);
});

router.post("/:userId", async (req: RequestWithBody, res: express.Response) => {
    const { title, content } = req.body;
    const { userId } = req.params;

    if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
    }

    if (!title || !content) {
        res.status(400).json({ message: "Title and content are required" });
        return;
    }

    const newArticle = await prisma.article.create({
        data: {
            title,
            content,
            authorId: userId,
        },
    });

    if (!newArticle) {
        res.status(400).json({ message: "Failed to create article" });
        return;
    }

    res.json(newArticle);
});

router.put("/:id", async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const updatedArticle = await prisma.article.update({
        where: { id },
        data: { title, content },
    });
    res.json(updatedArticle);
});

router.delete("/:id", async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    await prisma.article.delete({ where: { id } });
    res.json({ message: "Article deleted" });
});

export default router;
