/**
 * Configuration for Sign pages
 * This file contains all configuration settings for authentication pages
 */

// API Configuration
const DEFAULT_API_CONFIG = {
    // API_BASE_URL: 'http://localhost:8393',
    API_BASE_URL: 'https://adata.test.api.stroyka.kz',
    
    // NOTIFICATION_API_BASE_URL: 'http://localhost:8292',
    NOTIFICATION_API_BASE_URL: 'https://notification.test.api.stroyka.kz',
    
    // Auth endpoints
    AUTH_CALLBACK_ENDPOINT: '/api/v1/aitu/callback',
    
    // Notification endpoints
    SMS_SEND_ENDPOINT: '/api/v1/sms/send',
    
    // Redirect URLs
    SUCCESS_REDIRECT_URL: '/sign/success',
    ERROR_REDIRECT_URL: '/sign/error',
    
    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
    REDIRECT_DELAY: 2000,   // 2 seconds
};
if (typeof window !== 'undefined') {
    window.API_CONFIG = window.API_CONFIG || DEFAULT_API_CONFIG;
}

// Safe accessor for configuration
function getApiConfig() {
    if (typeof window !== 'undefined' && window.API_CONFIG) {
        return window.API_CONFIG;
    }
    return DEFAULT_API_CONFIG;
}

// Function to get API base URL
function getApiBaseUrl() {
    return getApiConfig().API_BASE_URL;
}

// Function to get full API URL
function getApiUrl(endpoint) {
    const baseUrl = getApiBaseUrl();
    return `${baseUrl}${endpoint}`;
}

// Function to get notification API base URL
function getNotificationApiBaseUrl() {
    return getApiConfig().NOTIFICATION_API_BASE_URL;
}

// Function to get full notification API URL
function getNotificationApiUrl(endpoint) {
    const baseUrl = getNotificationApiBaseUrl();
    return `${baseUrl}${endpoint}`;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getApiBaseUrl,
        getApiUrl,
        getNotificationApiBaseUrl,
        getNotificationApiUrl,
        API_CONFIG: getApiConfig()
    };
}
//

