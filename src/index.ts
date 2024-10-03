import express from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { AddressInfo } from 'net';

// Create a Prisma client
const prisma = new PrismaClient();

// Create an Express application
const app = express();

// Get the port from the environment variables, if not present, use 3000
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the assets folder
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Just a simple route to test the server
app.get('/', (req, res) => {
    res.send('Hello World');
});

const server = app.listen(PORT, () => {
    // Get the address of the server
    const address = server.address();

    // If address is null, only show the port
    if(address === null) {
        console.log(`Server running on port ${PORT}`);
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