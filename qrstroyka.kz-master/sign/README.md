# Sign Pages - Authentication Flow

This directory contains the authentication callback pages for the Stroyka.kz application.

## Pages

### `/sign/callback.html`
The main callback page that handles OAuth authentication responses.

**URL Parameters:**
- **Success**: `?code={authorization_code}&state={state}&scope={scope_1}%20{scope_2}%20{scope_N}`
- **Failure**: `?error={error_type}&error_description={error_description}&state={state}&scope={scope_1}%20{scope_2}%20{scope_N}`

**Features:**
- Processes OAuth callback parameters
- Calls the authentication endpoint
- Stores authentication data
- Redirects to success or error pages

### `/sign/success.html`
Displays successful authentication and user information.

**Features:**
- Shows user data from authentication response
- Provides navigation buttons
- Displays stored authentication information

### `/sign/error.html`
Displays authentication errors with detailed information.

**Features:**
- Shows detailed error information
- Provides retry functionality
- Allows clearing authentication data
- Offers navigation options

## Configuration

### API Base URL Configuration

The API base URL can be configured in several ways:

1. **Environment Variable** (Server-side):
   ```bash
   export API_BASE_URL=https://your-api-domain.com
   ```

2. **Meta Tag** (Client-side):
   ```html
   <meta name="api-base-url" content="https://your-api-domain.com">
   ```

3. **Global Variable** (Client-side):
   ```javascript
   window.API_BASE_URL = 'https://your-api-domain.com';
   ```

4. **Default Configuration** (in `config.js`):
   ```javascript
   window.API_CONFIG.API_BASE_URL = 'http://localhost:8393';
   ```

### Authentication Response Format

The callback endpoint expects a response in the following format:

```json
{
    "access_token": "string",
    "expires_in": 3600,
    "user_data": {
        "name": "string",
        "surname": "string",
        "patronymic": "string"
    },
    "scope": "string",
    "token_type": "Bearer",
    "phone": "string",
    "iin": "string",
    "bin": "string"
}
```

## Usage

### 1. Redirect to Callback Page

When an external service needs to redirect users after authentication:

```
https://your-domain.com/sign/callback?code=authorization_code&state=state_value
```

### 2. Handle Success

On successful authentication, users are automatically redirected to `/sign/success`.

### 3. Handle Errors

On authentication errors, users are redirected to `/sign/error` with detailed error information.

## API Endpoint

The callback page calls the following endpoint:

```
GET {API_BASE_URL}/api/v1/aitu/callback?code={code}&state={state}
```

## Styling

All pages use consistent styling that matches the main application design:
- Modern, clean interface
- Responsive design
- Consistent color scheme
- Mobile-friendly layout

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers
- Supports safe area insets for modern mobile devices

## Security Considerations

- Authentication data is stored in localStorage
- Error information is stored in sessionStorage
- All sensitive data is cleared when requested
- HTTPS is recommended for production use

## Development

To modify the configuration, edit `config.js`. To change styling, modify the CSS in each HTML file. The pages are designed to be self-contained and don't require external dependencies. 