# Copilot Rules for watchthis-user-service

## Project Overview

This is a Node.js/Express user authentication service built with TypeScript, MongoDB, and Passport.js. It provides signup, login, logout, and session management functionality for the WatchThis application ecosystem.

## Architecture & Patterns

### Application Structure

- **Entry Point**: `src/server.ts` - Simple server startup
- **Main App**: `src/app.ts` - Express application configuration and routes
- **Authentication**: `src/auth.ts` - Passport.js configuration and middleware
- **Models**: `src/models/user.ts` - Mongoose user model and schema
- **Views**: `views/` - Pug templates for UI
- **Tests**: `test/` - Node.js test runner with Supertest

### Technology Stack

- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with local strategy
- **Templates**: Pug view engine
- **Styling**: TailwindCSS with PostCSS
- **Testing**: Node.js built-in test runner with Supertest
- **Build**: TypeScript compilation to `dist/` directory

## Code Style & Conventions

### TypeScript Configuration

- Use ES modules throughout (`import/export`)
- Target output to `dist/` directory
- Enable strict type checking
- Use proper interface definitions for models
- Always type Express middleware functions with `RequestHandler`

### Authentication & Security

- **Password Hashing**: Always use bcrypt with salt rounds of 10
- **Session Management**: Use MongoDB session store with proper domain configuration
- **Environment Variables**: Provide sensible defaults for all env vars
- **Error Messages**: Use generic error messages to avoid information leakage
- **Input Validation**: Validate all user inputs before processing

### Database Patterns

- Use Mongoose schemas with proper TypeScript interfaces
- Implement model methods for password comparison
- Use virtual properties for computed fields (like `id`)
- Always use async/await for database operations
- Handle database connection errors gracefully

### Route Handling

- Use async functions wrapped in IIFEs for route handlers that need async operations
- Always handle errors in async routes with try/catch
- Use proper HTTP status codes
- Implement proper redirect logic with callback URL support
- Use middleware for authentication checks

### Error Handling

- Use try/catch blocks for all async operations
- Log errors to console for debugging
- Return appropriate HTTP status codes
- Provide user-friendly error messages
- Never expose sensitive information in error messages

## Development Conventions

### File Organization

- Keep route definitions in `app.ts`
- Separate authentication logic in `auth.ts`
- Place models in `src/models/` directory
- Use proper imports with `.js` extension for compiled output
- Keep types and interfaces close to their usage

### Testing Standards

- Use Node.js built-in test runner
- Create test database connections separate from production
- Use Faker.js for generating test data
- Test both success and failure scenarios
- Clean up test data after tests
- Use Supertest for HTTP endpoint testing

### Environment Configuration

- Use dotenv for environment variable management
- Provide defaults for all environment variables
- Use different database names for test environment
- Support both development and production configurations

### Build & Development

- Use concurrent builds for TypeScript, server, and CSS
- Support watch mode for development
- Separate build and start commands
- Use nodemon for development server restarts
- Build CSS with PostCSS and TailwindCSS

## Security Best Practices

### Authentication

- Hash passwords before storing in database
- Use secure session configuration
- Implement proper logout functionality
- Validate user credentials securely
- Use environment variables for secrets

### Session Management

- Store sessions in MongoDB for persistence
- Configure proper cookie domain settings
- Use secure session secrets
- Implement session validation endpoints

### Input Validation

- Validate all form inputs
- Sanitize user data before database operations
- Use proper error handling for invalid inputs
- Implement rate limiting considerations

## API Design

### Endpoint Patterns

- Use RESTful conventions where applicable
- Implement proper authentication middleware
- Support callback URL redirects
- Provide clear success/failure responses
- Use semantic HTTP status codes

### Response Handling

- Return appropriate content types
- Use consistent error response format
- Implement proper redirects for form submissions
- Support both HTML and JSON responses where needed

## Performance Considerations

### Database

- Use proper MongoDB indexing (username uniqueness)
- Implement connection pooling
- Handle database connection failures gracefully
- Use lean queries where appropriate

### Session Storage

- Use MongoDB for session persistence
- Configure proper session cleanup
- Implement session validation efficiently

## Testing Guidelines

### Unit Testing

- Test model methods (password comparison, hashing)
- Test authentication middleware
- Test route handlers independently
- Mock external dependencies

### Integration Testing

- Test complete authentication flows
- Test session management
- Test database interactions
- Test form submissions and redirects

### Test Data Management

- Use Faker.js for realistic test data
- Clean up test data after each test
- Use separate test database
- Avoid hardcoded test values

## Debugging & Monitoring

### Logging

- Use console.log for development debugging
- Log database connection status
- Log authentication events
- Avoid logging sensitive information

### Error Tracking

- Log errors with context
- Use proper error handling in middleware
- Implement graceful error recovery
- Provide meaningful error messages

## Code Quality

### Linting & Formatting

- Use eslint-config-plus-prettier for consistency
- Run linting on all TypeScript files with `npm run lint`
- Use Prettier for code formatting with `npm run format`
- Validate package.json structure with `npm run package:lint`
- Always ensure code passes: `npm run build`, `npm run test`, `npm run lint`, `npm run format`

### Documentation Maintenance

- Update Copilot documentation periodically when new patterns or information are learned
- Keep rules.md, workspace.md, and improvements.md synchronized with actual codebase
- Document new conventions and patterns as they are established
- Review and update documentation during significant refactoring efforts

### Type Safety

- Use proper TypeScript interfaces
- Type all function parameters and returns
- Use proper Mongoose typing
- Avoid `any` types where possible

## Deployment Considerations

### Build Process

- Compile TypeScript to JavaScript
- Build CSS from TailwindCSS sources
- Include all necessary files in distribution
- Support Heroku deployment with Procfile

### Environment Variables

- Document all required environment variables
- Provide development defaults
- Use proper production configurations
- Secure all sensitive configuration values
