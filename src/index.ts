import express from 'express';
import { PrismaClient, User } from '@prisma/client';
import path from 'path';
import { AddressInfo } from 'net';
import { API } from './iapi';
import UserAPI from './api/userAPI';
import ArticleAPI from './api/articleAPI';
import logger from './logger';
import settings from './settings';
import AssetsAPI from './api/assetsAPI';
import OpinionAPI from './api/opinionAPI';

// Create a Prisma client
const prisma = new PrismaClient();

// Create an Express application
const app = express();

app.use(
    new API()
        .addAPI(new UserAPI())
        .addAPI(new ArticleAPI())
        .addAPI(new AssetsAPI())
        .addAPI(new OpinionAPI())
        .apply()
);

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the assets folder
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Just a simple route to test the server
app.get('/', (req, res) => {
    res.send('Hello World');
});

const server = app.listen(settings.port, () => {
    // Get the address of the server
    const address = server.address();

    // If address is null, only show the port
    if(address === null) {
        console.log(`Server running on port ${settings.port}`);
        return;
    }

    // If address is an object of type AddressInfo then show the hostname and port
    if(typeof address === "object" && "port" in address) {
        let info = address as AddressInfo;

        // If the address is ::, then that does mean that we are on ipv6 interface
        // If the address is 0.0.0.0, then that does mean that we are on ipv4 interface
        // Either way, we need to show localhost as the hostname
        const hostname = info.address === '::' ? 'localhost' : info.address;
        console.log(`Server running on http://${hostname}:${info.port}`);
        return;
    } 

    // Address is a string there
    console.log(`Server running on port ${address}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});