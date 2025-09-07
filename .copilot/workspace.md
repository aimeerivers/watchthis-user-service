You are assisting with the watchthis-user-service, a Node.js/Express authentication microservice that handles user management for the WatchThis application ecosystem.

When working in this codebase:

1. **Authentication Focus**: This is an authentication service - prioritize security, session management, and user data protection

2. **TypeScript & ES Modules**: Use proper ES module syntax with `.js` extensions in imports for compiled output

3. **Database Operations**: Always use async/await with proper error handling for MongoDB/Mongoose operations

4. **Testing**: Test authentication flows end-to-end using Node.js test runner and Supertest

5. **Security**: Hash passwords with bcrypt, use secure sessions, validate inputs, and avoid exposing sensitive data

6. **Environment Configuration**: Support both development and production with proper defaults and test database separation

7. **Express Patterns**: Use proper middleware, handle async routes with IIFEs, and implement authentication guards

8. **Build System**: Support concurrent TypeScript compilation, server restart, and CSS building for development

Remember: This service handles sensitive user data and authentication - security and reliability are paramount.
