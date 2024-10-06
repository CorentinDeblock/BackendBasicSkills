import express from "express";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { AddressInfo } from "net";
import { APIException } from "./utils/httpUtils";
import logger from "./logger";
import settings from "./settings";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { handleError, parseQuery } from "./utils/middleware";
import UserAPI from "./api/userAPI";
import ArticleAPI from "./api/articleAPI";
import AuthAPI from "./api/authAPI";
import { passportSetup, passportClose } from "./utils/authUtils";

// Create a Prisma client
const prisma = new PrismaClient();

// Create an Express application
const app = express();

(async () => {
  await passportSetup(app);
})();

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
      description: "A sample API for learning Swagger",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./src/api/*.ts", "./src/iapi.ts"], // Path to the API docs
};

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  if (!(err instanceof APIException)) {
    logger.debug(`${err.message}\n${err.stack}`);
  }
});

app.use((req, res: express.Response, next) => {
  res.success = (message: string, payload?: unknown) => {
    if (payload === undefined) {
      res.json({ message });
    } else {
      res.json({ message, payload });
    }
  };

  next();
});

app.use(handleError);

const swaggerDoc = swaggerJSDoc(swaggerOptions);

// Handle form data
app.use(express.urlencoded({ extended: true }));

// Swagger documentation endpoint
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Serve static files from the assets folder
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse query parameters
app.use(parseQuery);

app.use("/user", UserAPI);
app.use("/article", ArticleAPI);
app.use("/auth", AuthAPI);

// Just a simple route to test the server
app.get("/", (req, res) => {
  res.send("Hello World");
});

const server = app.listen(settings.port, () => {
  // Get the address of the server
  const address = server.address();

  // If address is null, only show the port
  if (address === null) {
    logger.info(`Server running on port ${settings.port}`);
    return;
  }

  // If address is an object of type AddressInfo then show the hostname and port
  if (typeof address === "object" && "port" in address) {
    const info = address as AddressInfo;

    // If the address is ::, then that does mean that we are on ipv6 interface
    // If the address is 0.0.0.0, then that does mean that we are on ipv4 interface
    // Either way, we need to show localhost as the hostname
    const hostname = info.address === "::" ? "localhost" : info.address;
    logger.info(`Server running on http://${hostname}:${info.port}`);
    return;
  }

  // Address is a string there
  logger.info(`Server running on port ${address}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await passportClose();
  await prisma.$disconnect();
  process.exit();
});
