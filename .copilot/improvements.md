# Refactoring and Best Practices Recommendations

## Critical Issues to Address

### 1. Error Handling & User Experience

**Current Issue**: Poor error messages and inconsistent error handling
```typescript
// ❌ Current: Offensive and unprofessional error message
} catch {
  res.status(500).send("YOU IDIOT THATS TAKEN!");
}
```

**Recommendation**: 
```typescript
// ✅ Better: Professional error handling with proper status codes
} catch (error) {
  if (error.code === 11000) { // MongoDB duplicate key error
    req.flash('error', 'Username already exists');
    return res.redirect('/signup');
  }
  console.error('Signup error:', error);
  res.status(500).send('An error occurred during signup');
}
```

### 2. Inconsistent Async Pattern

**Current Issue**: Mix of IIFE patterns and direct async functions
```typescript
// ❌ Current: Inconsistent async handling
app.post("/signup", (req, res) => {
  (async function () {
    // async code
  })();
});
```

**Recommendation**: 
```typescript
// ✅ Better: Consistent async middleware pattern
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.post("/signup", asyncHandler(async (req, res) => {
  // async code
}));
```

### 3. Route Organization

**Current Issue**: All routes in single `app.ts` file
**Recommendation**: Extract routes into separate router modules:

```
src/
  routes/
    auth.ts
    user.ts
    api.ts
  middleware/
    auth.ts
    validation.ts
```

### 4. Input Validation Missing

**Current Issue**: No input validation on user registration/login
**Recommendation**: Add validation middleware:

```typescript
import { body, validationResult } from 'express-validator';

const validateSignup = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters, alphanumeric and underscore only'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
];
```

## Security Improvements

### 1. Rate Limiting

**Add rate limiting for authentication endpoints:**
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/login', authLimiter);
app.use('/signup', authLimiter);
```

### 2. CSRF Protection

**Add CSRF protection for forms:**
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
```

### 3. Security Headers

**Add security headers:**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}));
```

## Code Structure Improvements

### 1. Service Layer Pattern

**Create service classes for business logic:**
```typescript
// src/services/user.service.ts
export class UserService {
  async createUser(userData: CreateUserDto): Promise<IUser> {
    // User creation logic
  }

  async validateUser(username: string, password: string): Promise<IUser | null> {
    // User validation logic
  }
}
```

### 2. DTO Pattern

**Add Data Transfer Objects for type safety:**
```typescript
// src/dto/user.dto.ts
export interface CreateUserDto {
  username: string;
  password: string;
}

export interface LoginDto {
  username: string;
  password: string;
  callbackUrl?: string;
}
```

### 3. Environment Configuration

**Improve environment configuration:**
```typescript
// src/config/config.ts
import { z } from 'zod';

const configSchema = z.object({
  PORT: z.string().default('8583'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URL: z.string().default('mongodb://localhost:27017/user-service'),
  SESSION_SECRET: z.string().min(32),
  BASE_URL: z.string().url().default('http://localhost:8583'),
});

export const config = configSchema.parse(process.env);
```

## Testing Improvements

### 1. Test Organization

**Organize tests by feature:**
```
test/
  unit/
    models/
      user.test.ts
    services/
      user.service.test.ts
  integration/
    auth.test.ts
    routes.test.ts
  fixtures/
    users.ts
```

### 2. Test Helpers

**Create test utilities:**
```typescript
// test/helpers/auth.helper.ts
export async function createTestUser(userData: Partial<CreateUserDto> = {}) {
  const user = new User({
    username: faker.internet.username(),
    password: faker.internet.password(),
    ...userData,
  });
  return await user.save();
}

export async function loginUser(agent: any, credentials: LoginDto) {
  return await agent
    .post('/login')
    .send(credentials)
    .expect(302);
}
```

## Performance Optimizations

### 1. Database Indexing

**Add proper database indexes:**
```typescript
// In user model
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ createdAt: 1 });
```

### 2. Connection Pooling

**Optimize MongoDB connection:**
```typescript
mongoose.connect(mongoUserService, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 3. Response Caching

**Add caching for static responses:**
```typescript
import compression from 'compression';

app.use(compression());
```

## Logging & Monitoring

### 1. Structured Logging

**Replace console.log with proper logging:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### 2. Health Check Endpoint

**Add health check:**
```typescript
app.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});
```

## Documentation Improvements

### 1. API Documentation

**Add OpenAPI/Swagger documentation:**
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WatchThis User Service API',
      version: '2.0.14',
    },
  },
  apis: ['./src/routes/*.ts'],
};
```

### 2. Code Documentation

**Add JSDoc comments:**
```typescript
/**
 * Creates a new user account
 * @param userData - User registration data
 * @returns Promise resolving to created user
 * @throws {ValidationError} When user data is invalid
 * @throws {DuplicateError} When username already exists
 */
async createUser(userData: CreateUserDto): Promise<IUser> {
  // implementation
}
```

## Migration Path

1. **Phase 1**: Fix critical security issues (error messages, validation, rate limiting)
2. **Phase 2**: Refactor route organization and add service layer
3. **Phase 3**: Improve testing structure and coverage
4. **Phase 4**: Add monitoring, logging, and documentation
5. **Phase 5**: Performance optimizations and advanced features

Each phase should be implemented incrementally with proper testing to avoid breaking existing functionality.
