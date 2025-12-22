# Authentication Migration: Cookie-Based to Token-Based

This document explains the migration from cookie-based authentication to token-based authentication using localStorage and Authorization headers.

## Overview

The application has been migrated from httpOnly cookie-based authentication to token-based authentication using:
- **Token Storage**: localStorage (client-side)
- **Token Transmission**: Authorization header (Bearer token)
- **Backend Support**: Authorization header is now prioritized over cookies

## Key Changes

### 1. Client-Side Token Management (`src/lib/auth-client.js`)

New utility functions for token management:
- `setAuthToken(token)` - Store token in localStorage
- `getAuthToken()` - Retrieve token from localStorage
- `removeAuthToken()` - Remove token from localStorage
- `isAuthenticated()` - Check if user has a token
- `getAuthHeader()` - Get Authorization header value
- `getAuthHeaders(additionalHeaders)` - Get headers object with Authorization
- `authenticatedFetch(url, options)` - Fetch wrapper that adds Authorization header

### 2. Login Flow (`src/app/api/auth/login/route.js`)

- **Before**: Token set in httpOnly cookie
- **After**: Token returned in response body, stored in localStorage by client

### 3. Authentication Verification (`src/lib/auth.js`)

The `verifyAuth()` function now prioritizes:
1. Authorization header (Bearer token) - **PRIMARY**
2. Cookies (for backward compatibility during transition)

### 4. Middleware (`middleware.js`)

- **Before**: Checked for token in cookies, redirected if missing
- **After**: Allows all requests through (auth handled in API routes and client-side)

### 5. Logout (`src/components/DashboardLayout.js`)

- **Before**: Cleared cookie via server response
- **After**: Clears token from localStorage client-side

## Usage Guidelines

### For Client-Side API Calls

**Recommended: Use `authenticatedFetch`**

```javascript
import { authenticatedFetch } from '@/lib/auth-client';

// Automatically adds Authorization header
const res = await authenticatedFetch('/api/employees');
const data = await res.json();
```

**Alternative: Use `getAuthHeaders`**

```javascript
import { getAuthHeaders } from '@/lib/auth-client';

const res = await fetch('/api/employees', {
  headers: getAuthHeaders()
});
const data = await res.json();
```

### For Custom Headers

```javascript
import { getAuthHeaders } from '@/lib/auth-client';

const res = await fetch('/api/employees', {
  method: 'POST',
  headers: getAuthHeaders({
    'Custom-Header': 'value'
  }),
  body: JSON.stringify(data)
});
```

## Files Already Updated

The following files have been updated to use the new authentication system:

- ✅ `src/lib/auth-client.js` - New client-side auth utilities
- ✅ `src/lib/auth.js` - Updated to prioritize Authorization headers
- ✅ `src/app/api/auth/login/route.js` - Returns token in response body
- ✅ `src/app/api/auth/logout/route.js` - Simplified (client clears token)
- ✅ `src/app/login/page.js` - Stores token in localStorage
- ✅ `src/components/DashboardLayout.js` - Uses authenticatedFetch, clears localStorage on logout
- ✅ `src/app/dashboard/layout.js` - Simplified (auth handled client-side)
- ✅ `src/app/nda/page.js` - Uses authenticatedFetch
- ✅ `middleware.js` - Allows all requests (auth in API routes)

## Files That May Need Updates

While the backend now supports Authorization headers, some client-side files still use plain `fetch()`. These will continue to work but should be updated for consistency:

### High Priority (Authentication-related)
- All files making `/api/auth/check` calls
- All files making authenticated API calls in dashboard pages

### Example Update Pattern

**Before:**
```javascript
const res = await fetch('/api/employees');
```

**After:**
```javascript
import { authenticatedFetch } from '@/lib/auth-client';

const res = await authenticatedFetch('/api/employees');
```

## Benefits of Token-Based Authentication

1. **More Reliable**: No cookie domain/path issues
2. **Better for SPAs**: Works consistently across domains
3. **Easier Debugging**: Token visible in localStorage and request headers
4. **No Cookie Configuration**: No need to configure cookie settings for production
5. **Cross-Domain Support**: Easier to support multiple domains/subdomains

## Security Considerations

1. **XSS Protection**: Tokens are in localStorage, so ensure proper XSS protection
2. **Token Expiration**: Tokens expire after 24 hours (configurable in JWT generation)
3. **HTTPS Required**: Always use HTTPS in production (tokens sent in headers)
4. **Token Storage**: Consider sessionStorage for more security (tokens cleared on tab close)

## Testing

After migration, test:
1. ✅ Login stores token in localStorage
2. ✅ API calls include Authorization header
3. ✅ Logout clears token from localStorage
4. ✅ Unauthorized requests (401) redirect to login
5. ✅ Token expiration handled correctly

## Rollback Plan

If needed, the system maintains backward compatibility:
- Backend still checks cookies if Authorization header is missing
- Can switch back by updating `verifyAuth()` to prioritize cookies

However, for best results, complete the migration by updating all client-side fetch calls to use `authenticatedFetch` or `getAuthHeaders`.

