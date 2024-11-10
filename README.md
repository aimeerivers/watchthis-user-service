# watchthis-user-service

User management service for WatchThis

## Getting started

Add a `.env` file and add some environment variables:

```text
BASE_URL=http://localhost:8583
MONGO_URL=mongodb://localhost:27017/user-service
SESSION_SECRET=verysecret
```

Install npm dependencies

```bash
npm install
```

Install mongodb

```bash
brew tap mongodb/brew
brew install mongodb-community
```

Run mongodb locally

```bash
brew services start mongodb/brew/mongodb-community
```

If you want a GUI to look at the database, i recommend

```bash
brew install mongodb-compass
```

## Build the source code

```bash
npm run build
```

## Run unit tests

```bash
npm run test
```

## Build CSS

```bash
npm run tailwind:css
```

## Run the server locally

```bash
npm run start
```

Visit http://localhost:8583 in your browser

## Run in development mode

```bash
npm run dev
```

This will automatically rebuild the source code and restart the server for you.

## Format code

The project uses ESLint and Prettier to ensure consistent coding standards.

```bash
npm run lint
npm run format
npm run package:lint
```

- `lint` will check for errors and fix formatting in `.ts` and `.js` files.
- `format` will apply format rules to all possible files.
- `package:lint` will warn of any inconsistencies in the `package.json` file.
