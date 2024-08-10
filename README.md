# watchthis-user-service

User management service for WatchThis

## Getting started

Add a `.env` file and add some environment variables:

    BASE_URL=http://localhost:8583
    MONGO_URL=mongodb://localhost:27017/user-service
    SESSION_SECRET=verysecret

Install npm dependencies

    npm install

Install mongodb

    brew tap mongodb/brew
    brew install mongodb-community

Run mongodb locally

    brew services start mongodb/brew/mongodb-community

If you want a GUI to look at the database, i recommend

    brew install mongodb-compass

## Build the source code

    npm run build

## Run unit tests

    npm run test

## Run the server locally

    npm run start

Visit http://localhost:8583 in your browser

## Run in development mode

    npm run dev

This will automatically rebuild the source code and restart the server for you.

## Format code

The project uses ESLint and Prettier to ensure consistent coding standards.

    npm run package:lint
    npm run lint
    npm run format

- `package:lint` will ensure the `package.json` file confirms to conventions.
- `lint` will check for errors and fix formatting in `.ts` and `.js` files.
- `format` will apply format rules to all possible files.
