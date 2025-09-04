# Technical Issues History - Trainer Portal

## Overview
This document catalogs all technical issues, errors, and solutions encountered during the development of the Trainer Portal application. It serves as a reference for future development to avoid repeating the same problems.

## Table of Contents
1. [TypeScript Errors](#typescript-errors)
2. [Linting Issues](#linting-issues)
3. [Styling & CSS Problems](#styling--css-problems)
4. [Tailwind CSS Issues](#tailwind-css-issues)
5. [Race Conditions](#race-conditions)
6. [Database/Prisma Issues](#databaseprisma-issues)
7. [Build/Compilation Problems](#buildcompilation-problems)
8. [Authentication Issues](#authentication-issues)
9. [API Endpoint Problems](#api-endpoint-problems)
10. [File Upload Issues](#file-upload-issues)

## TypeScript Errors

### 1. Prisma Client Property Not Found
**Error**: `TSError: ⨯ Unable to compile TypeScript: prisma/seed.ts:16:16 - error TS2339: Property 'country' does not exist on type 'PrismaClient'`

**Cause**: Missing reverse relation in Prisma schema after adding foreign keys.

**Solution**:
```prisma
// In schema.prisma, add reverse relation
model Country {
  // ... existing fields
  trainers Trainer[]
}
```

**Prevention**: Always regenerate Prisma client after schema changes: `npx prisma generate`

### 2. State Type Mismatches
**Error**: `Type 'boolean' is not assignable to type 'string | number | readonly string[]'`

**Cause**: Incorrect state type definitions in React components.

**Solution**:
```typescript
// Incorrect
const [isRegistering, setIsRegistering] = useState<boolean>(false);

// Correct - let TypeScript infer the type
const [isRegistering, setIsRegistering] = useState(false);
```

### 3. Prisma Query Result Types
**Error**: `Property 'X' does not exist on type 'Y[]'`

**Cause**: Incorrect Prisma query structure or missing includes.

**Solution**:
```typescript
// Incorrect
const trainer = await prisma.trainer.findUnique({
  where: { id },
  include: { trainingCompany: true } // Wrong relation
});

// Correct
const trainer = await prisma.trainer.findUnique({
  where: { id },
  include: {
    inquiries: {
      include: { trainingCompany: true }
    }
  }
});
```

## Linting Issues

### 1. ESLint Rules Too Strict
**Error**: Build failing due to minor linting issues.

**Solution**: Relax ESLint rules in `.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 2. Unused Variables
**Error**: `@typescript-eslint/no-unused-vars` errors blocking builds.

**Solutions**:
- Add `eslint-disable-next-line` for intentional unused variables
- Remove unused imports
- Use underscore prefix for intentionally unused parameters: `_unusedVar`

## Styling & CSS Problems

### 1. CSS Not Loading/Broken Layout
**Error**: Homepage showing only big icons, no styling applied.

**Symptoms**:
- HTML renders correctly
- CSS file not being served properly
- Tailwind classes not applied

**Root Causes**:
1. Conflicting PostCSS configurations
2. CSS compilation failures
3. Build process errors

**Solutions**:
1. **Remove conflicting PostCSS config**:
   ```bash
   rm postcss.config.js  # Keep only postcss.config.mjs
   ```

2. **Clean build**:
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Check CSS file serving**:
   ```bash
   curl -s "http://localhost:3000/_next/static/css/app/layout.css"
   ```

### 2. Custom CSS Properties Not Applied
**Error**: Custom CSS variables in `globals.css` not working.

**Cause**: Tailwind CSS overriding custom styles.

**Solution**: Temporarily disable conflicting body styles during debugging:
```css
/* Temporarily comment out conflicting styles */
/*
body {
  background: var(--ptw-bg-primary);
  color: var(--ptw-text-primary);
}
*/
```

## Tailwind CSS Issues

### 1. Custom Colors Not Working
**Error**: `primary-50`, `primary-100` classes not applied.

**Cause**: Custom colors not properly defined in `tailwind.config.js`.

**Solution**: Ensure proper color definition:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          // ... more shades
        }
      }
    }
  }
}
```

### 2. Content Paths Not Scanned
**Error**: Tailwind classes not generated despite being used.

**Solution**: Ensure all content paths are included:
```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',     // Include app directory
    './components/**/*.{js,ts,jsx,tsx}', // Include components
    './src/**/*.{js,ts,jsx,tsx}',     // Include src directory
  ]
}
```

### 3. PostCSS Configuration Conflicts
**Error**: Multiple PostCSS configs causing build failures.

**Solution**: Use only one PostCSS config file (prefer `.mjs` for ES modules).

## Race Conditions

### 1. Authentication Redirect Loop
**Error**: Login link redirecting to homepage instead of dashboard.

**Symptoms**:
- Token verification succeeds
- User redirected to `/` instead of `/dashboard`
- Multiple rapid redirects

**Root Cause**: Race condition between token verification and route changes.

**Solutions**:
1. **Use useRef for state tracking**:
```typescript
const hasProcessedAuth = useRef(false);

// Prevent multiple processing
if (hasProcessedAuth.current) return;

// Mark as processed
hasProcessedAuth.current = true;
```

2. **Proper cleanup timing**:
```typescript
// Set initialized BEFORE cleaning URL
setInitialized(true);
router.replace('/dashboard', { scroll: false });
```

3. **Minimize database queries**:
```typescript
// Use select to fetch only needed fields
prisma.loginToken.update({
  where: { token },
  data: { used: true },
  select: { id: true } // Only fetch ID
})
```

### 2. Multiple Server Processes
**Error**: Multiple Next.js servers running simultaneously.

**Solution**: Always kill existing processes before starting:
```bash
pkill -f next
npm run dev
```

### 3. Layout vs Page Authentication Race Condition (Latest Fix - 2024)
**Error**: Dashboard layout and page components both trying to handle authentication simultaneously, causing redirects to homepage.

**Symptoms**:
- Token URL redirects to `/` instead of `/dashboard`
- Multiple authentication flows competing
- `hasProcessedAuth` ref not preventing race conditions
- **Common additional issue**: Token expiration (401 errors) - tokens expire after 7 days

**Prevention for Token Issues**:
- Tokens expire after 7 days by design for security
- Always generate fresh tokens for testing
- Check token status in database before testing
- Use `npx prisma studio` to inspect token state

### 4. Improved User Experience for Token Errors (Latest Fix - 2024)
**Error**: Users getting redirected without explanation when tokens are expired/used.

**Symptoms**:
- Silent redirect to homepage on expired token
- No user feedback about what went wrong
- Poor user experience during authentication failures

**Solution**:
1. **Enhanced Error Handling in Dashboard**:
   ```typescript
   // Handle specific error cases with user-friendly messages
   if (response.status === 401) {
     if (errorData.message.includes('abgelaufen')) {
       setErrorMessage('Dieser Login-Link ist abgelaufen. Bitte fordern Sie einen neuen an.');
     } else if (errorData.message.includes('bereits verwendet')) {
       setErrorMessage('Dieser Login-Link wurde bereits verwendet. Bitte fordern Sie einen neuen an.');
     } else {
       setErrorMessage('Ungültiger Login-Link. Bitte melden Sie sich erneut an.');
     }
   }
   ```

2. **User-Friendly Error UI**:
   ```jsx
   {errorMessage && (
     <div className="error-message-card">
       <WarningIcon />
       <h3>Anmeldung fehlgeschlagen</h3>
       <p>{errorMessage}</p>
       <Link href="/register?mode=login">Zur Anmeldung</Link>
     </div>
   )}
   ```

3. **Prevention of Silent Redirects**:
   - Show specific error messages instead of redirecting
   - Provide clear call-to-action buttons
   - Maintain user context and prevent confusion

### 5. Profile Page Reference Error (Latest Fix - 2024)
**Error**: `ReferenceError: trainer is not defined` on profile page.

**Symptoms**:
- Profile page crashes with reference error
- Unable to access `/dashboard/profile`
- Console shows "trainer is not defined"

**Root Cause**:
- Variable name inconsistency: state was named `user` but code was checking `trainer`
- Indentation issues in trainer profile loading section

**Solution**:
1. **Fixed Variable Reference**:
   ```typescript
   // Before (incorrect):
   if (!trainer) {

   // After (correct):
   if (!user) {
   ```

2. **Fixed Indentation Issues**:
   ```typescript
   // Fixed indentation in trainer profile loading
   const response = await fetch('/api/trainer/profile');
   if (response.ok) {
     const data = await response.json();
     setUser(data);
     setFormData({
       // Proper indentation for all fields
     });
   }
   ```

3. **Prevention**:
   - Consistent variable naming throughout components
   - Proper code formatting and indentation
   - Type checking to catch undefined variable references

### 6. Topic Search API Field Error (Latest Fix - 2024)
**Error**: `POST /api/trainers/search 500` when searching for topics in training creation.

**Symptoms**:
- Topic input field doesn't show suggestions
- 500 server error when typing in topic field
- Console shows Prisma validation error for unknown field

**Root Cause**:
- API trying to select `status` field from Topic model
- Topic model doesn't have a `status` field
- Invalid Prisma query causing server error

**Solution**:
```typescript
// Before (incorrect):
select: {
  id: true,
  name: true,
  status: true  // ❌ Topic model doesn't have status field
}

// After (correct):
select: {
  id: true,
  name: true  // ✅ Only existing fields
}
```

**Additional Improvements**:
- Added null checks for topic objects in frontend
- Added fallback filtering for better error handling
- Made topic search more robust against API response variations

**Prevention**:
- Always validate Prisma queries against actual schema
- Test API endpoints after schema changes
- Add proper error handling for database queries
- Use TypeScript interfaces that match actual database schema

**Root Cause**: Both layout and page components handling authentication logic concurrently.

**Solutions**:
1. **Centralize Authentication Logic**:
   ```typescript
   // In layout.tsx - Remove authentication logic
   useEffect(() => {
     const init = async () => {
       const userData = getTrainerData();
       if (userData) {
         setUser(userData as unknown as User);
       }
       // Let page handle all authentication
     };
     init();
   }, []); // No router dependency
   ```

2. **Add Auth Progress State**:
   ```typescript
   // In page.tsx
   const [authInProgress, setAuthInProgress] = useState(false);

   const verifyTokenAndLogin = useCallback(async (token: string) => {
     if (hasProcessedAuth.current || authInProgress) {
       console.log('Authentication already in progress, skipping...');
       return;
     }

     setAuthInProgress(true);
     hasProcessedAuth.current = true;

     try {
       // Authentication logic
       setAuthInProgress(false); // Reset on success
     } catch (error) {
       setAuthInProgress(false); // Reset on error
       hasProcessedAuth.current = false;
     }
   }, []);
   ```

3. **Improve useEffect Dependencies**:
   ```typescript
   useEffect(() => {
     if (hasProcessedAuth.current || authInProgress) {
       return;
     }

     const initAuth = async () => {
       try {
         const token = searchParams.get('token');
         if (token) {
           await verifyTokenAndLogin(token);
         } else {
           // Check existing session
         }
       } catch (error) {
         // Handle error and reset flags
         hasProcessedAuth.current = false;
         setAuthInProgress(false);
       }
     };

     initAuth();
   }, [searchParams]); // Only depend on searchParams
   ```

## Database/Prisma Issues

### 1. Foreign Key Constraint Violations
**Error**: `Foreign key constraint violated on the fields: (trainerId)` during seeding.

**Cause**: Deleting parent records before child records.

**Solution**: Reorder deletion operations:
```typescript
// Delete child records first
await prisma.trainerProfileVersion.deleteMany();
await prisma.trainerTopic.deleteMany();
await prisma.trainer.deleteMany();

// Then delete parent records
await prisma.topic.deleteMany();
await prisma.country.deleteMany();
```

### 2. Missing Database Indexes
**Error**: Slow queries due to missing indexes.

**Solution**: Add indexes to frequently queried fields:
```prisma
model Trainer {
  // ... fields
  @@index([email])
  @@index([status])
  @@index([userType])
}
```

### 3. Auto-increment Reset Issues
**Error**: IDs not resetting properly after seeding.

**Solution**: Add explicit AUTO_INCREMENT reset:
```sql
ALTER TABLE trainer AUTO_INCREMENT = 1;
ALTER TABLE training_company AUTO_INCREMENT = 1;
```

## Build/Compilation Problems

### 1. TypeScript Compilation Failures
**Error**: Build stops due to TypeScript errors.

**Solution**: Use `tsc --noEmit` to check types without building:
```bash
npx tsc --noEmit
```

### 2. Module Resolution Issues
**Error**: Cannot find module errors.

**Solution**: Ensure proper path aliases in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### 3. Development Server Issues
**Error**: Server not responding or responding on wrong port.

**Solutions**:
- Check if port is in use: `lsof -i :3000`
- Kill conflicting processes: `pkill -f next`
- Clean cache: `rm -rf .next node_modules/.cache`

## Authentication Issues

### 1. Token Verification Timing
**Error**: Authentication state not properly synchronized.

**Solution**: Use proper loading states and error boundaries:
```typescript
const [isLoading, setIsLoading] = useState(true);
const [user, setUser] = useState(null);

// Always handle loading state
if (isLoading) return <LoadingSpinner />;
```

### 2. Cookie Security Issues
**Error**: Authentication cookies not properly secured.

**Solution**: Set secure cookie options:
```typescript
cookies().set('mr_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7 // 7 days
});
```

## API Endpoint Problems

### 1. Missing Error Handling
**Error**: API endpoints not handling errors gracefully.

**Solution**: Always wrap API logic in try-catch:
```typescript
export async function POST(request: Request) {
  try {
    const data = await request.json();
    // API logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2. Incorrect HTTP Status Codes
**Error**: Returning wrong status codes for API responses.

**Common Issues**:
- Returning 200 for errors
- Not using 404 for not found
- Missing 401 for unauthorized

**Solution**: Use appropriate status codes:
```typescript
// 400 Bad Request - validation errors
// 401 Unauthorized - authentication required
// 403 Forbidden - insufficient permissions
// 404 Not Found - resource doesn't exist
// 500 Internal Server Error - server errors
```

### 3. CORS Issues
**Error**: API requests blocked by CORS policy.

**Solution**: Configure CORS properly:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

## File Upload Issues

### 1. File Size Limits
**Error**: Large files failing to upload.

**Solution**: Configure Next.js file size limits:
```javascript
// next.config.mjs
export default {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // File upload size limits
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
```

### 2. Base64 Encoding Issues
**Error**: File data not properly encoded/decoded.

**Solution**: Proper base64 handling:
```typescript
// Reading file as base64
const reader = new FileReader();
reader.onload = () => {
  const base64 = reader.result?.toString().split(',')[1];
  // Use base64 data
};
reader.readAsDataURL(file);
```

## Best Practices Learned

### 1. Development Workflow
- Always run `npx prisma generate` after schema changes
- Use `npm run build` to catch build issues early
- Run linting: `npm run lint`
- Type check: `npx tsc --noEmit`

### 2. Error Prevention
- Use TypeScript strict mode
- Implement proper error boundaries
- Add loading states for async operations
- Validate data at API boundaries

### 3. Debugging Techniques
- Use browser DevTools Network tab
- Check server logs for errors
- Use `console.log` strategically
- Test API endpoints with tools like Postman/cURL

### 4. Performance Optimization
- Minimize database queries
- Use proper indexes
- Implement caching where appropriate
- Optimize images and assets

## Quick Reference Commands

```bash
# Clean everything and restart
rm -rf .next node_modules/.cache
npm run dev

# Check TypeScript errors
npx tsc --noEmit

# Check linting
npm run lint

# Generate Prisma client
npx prisma generate

# Reset database
npx prisma db push --force-reset
npm run seed

# Check running processes
ps aux | grep next
lsof -i :3000
```

## Future Prevention Strategies

1. **Automated Testing**: Add unit and integration tests
2. **CI/CD Pipeline**: Automated linting and type checking
3. **Code Reviews**: Peer review for common issues
4. **Documentation**: Keep this file updated with new issues
5. **Error Monitoring**: Implement error tracking in production
6. **Performance Monitoring**: Track slow queries and endpoints

---

*Last Updated: [Current Date]*
*Next.js Version: 14.2.15*
*Prisma Version: [Check package.json]*
*TypeScript Version: [Check package.json]*
