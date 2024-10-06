import { Article, Asset, PrismaClient, User } from "@prisma/client";
import express from "express";
import { APIException, Uploader } from "../utils/httpUtils";
import { deleteFile } from "../utils/fsUtils";
import { authenticateJWT } from "../utils/authUtils";

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

type RequestWithInclude = express.Request<
  object,
  object,
  object,
  RawArticleInclude
>;

type RequestWithBody = express.Request<
  { userId: string },
  object,
  Omit<Article, "id" | "authorId" | "createdAt" | "updatedAt">,
  RawArticleInclude
>;

type RequestWithParams = express.Request<
  { id: string },
  object,
  object,
  RawArticleInclude
>;

type RequestWithLimit = express.Request<
  object,
  object,
  object,
  { skip: number; take: number } & RawArticleInclude
>;

function parseIncludeQuery(query: RawArticleInclude): ArticleInclude {
  const include: ArticleInclude = {
    author: query.author === "true" ? true : false,
    options: query.options === "true" ? true : false,
    assets: query.assets === "true" ? true : false,
  };
  return include;
}

const uploader = new Uploader("/assets/images/uploads", onCheck, onUpdate);

async function onCheck(
  req: RequestWithParams,
  res: express.Response
): Promise<Asset | Asset[]> {
  const article = await prisma.article.findUnique({
    where: {
      id: req.params.id,
      authorId: req.user!.id,
    },
    include: {
      assets: true,
    },
  });

  if (!article) {
    throw new APIException(
      req,
      res,
      "Article not found or not owned by requester",
      404,
      { id: req.params.id },
      undefined
    );
  }

  return article.assets;
}

async function onUpdate(req: express.Request, res: express.Response) {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new APIException(
      req,
      res,
      "No files uploaded",
      400,
      { files: req.files },
      undefined
    );
  }

  const assets = await prisma.asset.createMany({
    data: files.map((file) => ({
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      articleId: req.params.id,
    })),
  });

  if (assets.count === 0) {
    throw new APIException(
      req,
      res,
      "Failed to upload assets",
      500,
      { files: req.files },
      undefined
    );
  }

  res.status(201).success("Success", assets);
}

async function createOrUpdateOpinion(
  req: express.Request,
  res: express.Response
) {
  const { id } = req.params;
  const { opinionType } = req.body;
  const user = req.user!;

  if (!id) {
    throw new APIException(
      req,
      res,
      "'id' are required in path. See documentation for more details.",
      400,
      { id: id },
      undefined
    );
  }

  if (!opinionType) {
    throw new APIException(
      req,
      res,
      "'opinionType' is required. See documentation for more details.",
      400,
      { id: id },
      undefined
    );
  }

  const opinion = await prisma.opinion.upsert({
    where: {
      articleId: id,
      userId: user.id,
    },
    update: {
      opinionType: req.body.opinionType,
    },
    create: {
      articleId: id,
      userId: user.id,
      opinionType: req.body.opinionType,
    },
  });

  res.status(201).success("Success", opinion);
}

async function deleteOpinion(req: express.Request, res: express.Response) {
  const { id } = req.params;
  const user = req.user!;

  if (!id) {
    throw new APIException(
      req,
      res,
      "'id' are required in path. See documentation for more details.",
      400,
      { id, userId: user.id },
      undefined
    );
  }

  const opinion = await prisma.opinion.delete({
    where: { articleId: id, userId: user.id },
  });

  if (!opinion) {
    throw new APIException(
      req,
      res,
      "Opinion not found. See documentation for more details.",
      404,
      { id },
      undefined
    );
  }

  res.status(204).send();
}

async function getArticles(
  req: express.Request<
    object,
    object,
    object,
    { skip: number; take: number } & RawArticleInclude
  >,
  res: express.Response
) {
  const { skip, take } = req.query;

  if (!skip || !take) {
    throw new APIException(
      req,
      res,
      "'skip' and 'take' are required. See documentation for more details.",
      400,
      { skip: skip, take: take },
      undefined
    );
  }

  const articles = await prisma.article.findMany({
    include: parseIncludeQuery(req.query as RawArticleInclude),
    skip: skip,
    take: take,
  });

  res.success("Success", articles);
}

async function getArticleById(req: express.Request, res: express.Response) {
  const { id } = req.params;

  if (!id) {
    throw new APIException(
      req,
      res,
      "'id' is required in path. See documentation for more details.",
      400,
      { id: id },
      undefined
    );
  }

  const article = await prisma.article.findUnique({
    where: { id },
    include: parseIncludeQuery(req.query as RawArticleInclude),
  });

  if (!article) {
    throw new APIException(
      req,
      res,
      "Article not found",
      404,
      { id: id },
      undefined
    );
  }

  res.success("Success", article);
}

async function createArticle(req: RequestWithBody, res: express.Response) {
  const { title, content } = req.body;
  const userId = req.user!.id;

  if (!title || !content) {
    throw new APIException(
      req,
      res,
      "'title' and 'content' are required. See documentation for more details.",
      400,
      { userId: userId },
      undefined
    );
  }

  const newArticle = await prisma.article.create({
    data: {
      title,
      content,
      authorId: userId,
    },
  });

  if (!newArticle) {
    throw new APIException(
      req,
      res,
      "Failed to create article. See documentation for more details.",
      400,
      { userId: userId },
      undefined
    );
  }

  res.status(201).success("Success", newArticle);
}

async function updateArticle(req: express.Request, res: express.Response) {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!id) {
    throw new APIException(
      req,
      res,
      "'id' is required in path. See documentation for more details.",
      400,
      { id: id },
      undefined
    );
  }

  if (!title && !content) {
    throw new APIException(
      req,
      res,
      "'title' and 'content' are required. See documentation for more details.",
      400,
      { id: id },
      undefined
    );
  }

  const updatedArticle = await prisma.article.update({
    where: { id },
    data: { title, content },
  });

  if (!updatedArticle) {
    throw new APIException(
      req,
      res,
      "Failed to update article",
      500,
      { id: id },
      undefined
    );
  }

  res.success("Success", updatedArticle);
}

async function deleteArticle(req: express.Request, res: express.Response) {
  const { id } = req.params;

  if (!id) {
    throw new APIException(
      req,
      res,
      "'id' is required in path. See documentation for more details.",
      400,
      { id: id },
      undefined
    );
  }

  const deletedArticle = await prisma.article.delete({
    where: { id },
    include: {
      assets: true,
    },
  });

  if (!deletedArticle) {
    throw new APIException(
      req,
      res,
      "Failed to delete article",
      500,
      { id: id },
      undefined
    );
  }

  if (deletedArticle.assets) {
    deletedArticle.assets.forEach(async (asset) => {
      await deleteFile(asset.path);
    });
  }

  res.status(204).send();
}

router.post("/:id/opinion/", authenticateJWT, createOrUpdateOpinion);
router.delete("/:id/opinion/", authenticateJWT, deleteOpinion);

router.post("/:id/upload-file", authenticateJWT, ...uploader.array("articles"));

router.get(
  "/",
  authenticateJWT,
  (req: express.Request<any, any, any, any>, res: express.Response) =>
    getArticles(req, res)
);
router.get("/:id", authenticateJWT, getArticleById);
router.post("/", authenticateJWT, createArticle);
router.put("/:id", authenticateJWT, updateArticle);
router.delete("/:id", authenticateJWT, deleteArticle);

export default router;
