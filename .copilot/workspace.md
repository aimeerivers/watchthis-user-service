You are assisting with the watchthis-user-service, a Node.js/Express authentication microservice that handles user management for the WatchThis application ecosystem.

When working in this codebase:

1. **Authentication Focus**: This is an authentication service - prioritize security, session management, and user data protection

2. **TypeScript & ES Modules**: Use proper ES module syntax with `.js` extensions in imports for compiled output

3. **Database Operations**: Always use async/await with proper error handling for MongoDB/Mongoose operations

4. **Testing**: Test authentication flows end-to-end using Node.js test runner and Supertest. All tests must pass with valid data generators.

5. **Security**: Hash passwords with bcrypt, use secure sessions, validate inputs with middleware, use Helmet for security headers

6. **Environment Configuration**: Support both development and production with proper defaults and test database separation

7. **Express Patterns**: Use asyncHandler utility for consistent error handling, implement validation middleware, and use authentication guards

8. **Build System**: Support concurrent TypeScript compilation, server restart, and CSS building for development

9. **Code Quality**: Always ensure code passes `npm run build`, `npm run test`, `npm run lint`, and `npm run format`

10. **Project Structure**:
    - `src/utils/` for utilities like asyncHandler
    - `src/middleware/` for validation and other middleware
    - `test/helpers/` for test utilities and data generators
    - Consistent async patterns throughout

Remember: This service handles sensitive user data and authentication - security and reliability are paramount. All changes must maintain test coverage and follow established patterns.
