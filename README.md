## BasicSkillBackend

## Project Description
This project is a backend service built with Node.js and TypeScript, containerized using Docker. It provides [brief description of what your service does].

## Prerequisites
- Node.js (version X.X.X)
- Docker
- Docker Compose

## Getting Started

Clone the repository:
   ```
   git clone [your-repo-url]
   cd BasicSkillBackend
   ```

### Development Setup

Start the development server in development mode:
   ```
   npm run docker-dev up
   ```

This will start the server with hot-reloading enabled at `http://localhost:3000` (or the port you've specified).

### Production Setup

Build and start the Docker containers in production mode:
   ```
   npm run docker-prod up
   ```

The service will be available at `http://localhost:3000` (or the port you've specified).

### Initialize everything

```
npm run docker-init
```

Be aware that the docker container need to be running.

### Seed the database

```
npm run docker-seed
```

Be aware that the docker container need to be running and also that you have initialized everything.

### Initialize everything and seed the database

```
npm run docker-init-and-seed
```

This is the best way to initialize everything and seed the database without having to run multiple commands or to worry about the order of the commands. Be aware that the docker container need to be running.

### Run the tests

```
npm run docker-test
```

## Available Scripts
- `npm test`: Runs the tests
- `npm run dev`: Starts the development server with hot-reloading
- `npm start`: Starts the production server
- `npm run build`: Builds the TypeScript code to JavaScript
- `npm run docker-dev up`: Starts the docker container in development mode with hot-reloading
- `npm run docker-prod up`: Starts the docker container in production mode
- `npm run docker-init`: Initializes the database in the docker container
- `npm run docker-seed`: Seeds the database in the docker container
- `npm run docker-init-and-seed`: Initializes the database and seeds the database in the docker container
- `npm run docker-test`: Runs the tests in the docker container

## Environment Variables
- `NODE_ENV`: Set to 'development' or 'production'
- [List other important environment variables]

## API Documentation
None for now