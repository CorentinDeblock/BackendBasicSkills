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

Be aware that the docker container need to be running.

### Run the migrations

```
npm run docker-migrate
```

Run a migration with a name. Be aware that the docker container need to be running.

### Reset the migrations

```
npm run docker-migrate-reset
```

Reset the migrations folder and the database. Be aware that the docker container need to be running.

### Resolve the migrations

```
npm run docker-migrate-resolve
```

Resolve the migrations. Be aware that the docker container need to be running.

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
- `npm run docker-migrate`: Runs the migrations in the docker container
- `npm run docker-migrate-reset`: Resets the migrations in the docker container
- `npm run docker-migrate-resolve`: Resolves the migrations in the docker container

## Environment Variables

- Node
  - `NODE_ENV`: Set to 'development' or 'production'
  - `PORT`: Set the port number
  - `DATABASE_URL`: Set the database url
  - `JWT_SECRET`: Set the secret for the json web token
  - `JWT_EXPIRES_IN`: Set the expiration time for the
  json web token
  - `LOG_DATA`: Set to 'true' to log the data
  - `VERBOSE`: Set to 'true' to enable verbose logging
- Database
  - `POSTGRES_DB`: Set the database name
  - `POSTGRES_USER`: Set the database user
  - `POSTGRES_PASSWORD`: Set the database password

## API Documentation
None for now