/**
 * API Service for Order Management
 * Handles all API calls for order operations
 */

const API_BASE_URL = 'https://dictionary.test.api.stroyka.kz/api/v1';
const CMR_API_BASE_URL = 'https://cmr.test.api.stroyka.kz';

class ApiService {
    constructor() {
        this.headers = {
            'Content-Type': 'application/json'
        };
        this.language = 'kk'; // Default language
    }

    /**
     * Set authorization token
     */
    setAuthToken(token) {
        if (token) {
            this.headers['Authorization'] = `Bearer ${token}`;
        } else {
            delete this.headers['Authorization'];
        }
    }

    /**
     * Set language
     */
    setLanguage(language) {
        this.language = language;
    }

    /**
     * Generic fetch wrapper with error handling
     */
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.headers,
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle different response types
            const contentType = response.headers.get('content-type');
            
            // Clone the response so we can read it multiple times if needed
            const responseClone = response.clone();
            
            // Try to parse as JSON first
            try {
                const data = await response.json();
                return data;
            } catch (jsonError) {
                
                // Use the cloned response for text reading
                try {
                    const text = await responseClone.text();
                    
                    // If it looks like a password/token (alphanumeric with special chars), return as is
                    if (text && text.length > 0 && /^[a-zA-Z0-9@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(text)) {
                        return text;
                    }
                    
                    // Try to parse as JSON again (sometimes content-type is wrong)
                    try {
                        const parsedData = JSON.parse(text);
                        return parsedData;
                    } catch (parseError) {
                        return text;
                    }
                } catch (textError) {
                    console.error('Failed to read response as text:', textError);
                    throw textError;
                }
            }
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // === AUTHENTICATION API ===
    
    /**
     * Register user
     */
    async registerUser(phone, agreement = true) {
        const url = `${CMR_API_BASE_URL}/rest/api/v1/register/auth`;
        return await this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify({
                login: phone,
                agreement: agreement
            })
        });
    }

    /**
     * Send SMS verification code
     */
    async sendSMS(phone) {
        const url = `${CMR_API_BASE_URL}/rest/api/v1/register/send`;
        return await this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify({
                login: phone,
                smsType: 'SYSTEM'
            })
        });
    }

    /**
     * Verify SMS code
     */
    async verifySMS(phone, smsCode) {
        const url = `${CMR_API_BASE_URL}/rest/api/v1/register/auth/activate`;
        return await this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify({
                login: phone,
                smsCode: smsCode,
                smsType: 'SYSTEM'
            })
        });
    }

    /**
     * Get authentication token
     */
    async getAuthToken(phone, password) {
        const url = `${CMR_API_BASE_URL}/oauth2/token`;
        
        const formData = new URLSearchParams();
        formData.append('grant_type', 'password');
        formData.append('username', phone);
        formData.append('password', password);

        return await this.makeRequest(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ZWdjendqYWJxbjpjVENsaW1Fd0FG'
            },
            body: formData
        });
    }

    // === ORDER DICTIONARY API ===

    /**
     * Get work types for orders
     */
    async getWorkTypes(searchText = '') {
        let url = `${API_BASE_URL}/dictionary/service?serviceTree=WORK_TYPE&parentId=1`;
        if (searchText) {
            url += `&search=${encodeURIComponent(searchText)}`;
        }
        return await this.makeRequest(url);
    }

    // === LOCATION API ===

    /**
     * Get addresses (regions, districts, cities)
     */
    async getAddresses(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/kato?katoType=REGION`;
        return await this.makeRequest(url);
    }

    // === ORDER CREATION API ===

    /**
     * Create order
     */
    async createOrder(orderData) {
        const url = `${CMR_API_BASE_URL}/rest/api/v1/order`;
        
        // Upload files first and get refs/urls
        let fileRefs = [];
        if (orderData.files && orderData.files.length > 0) {
            fileRefs = await this.uploadFiles(orderData.files);
        }
        
        // Build payload as per the required structure
        const payload = {
            requestBody: {
                categories: {
                    serviceType: { id: 1, name: "Строительно-монтажные работы" }, // always same
                    workType: { 
                        id: orderData.workType.id, 
                        name: orderData.workType.name 
                    }
                },
                name: orderData.orderName,
                description: orderData.description || null,
                additionalInfo: orderData.additionalInfo || null,
                planStartDate: orderData.planStartDate,
                planEndDate: orderData.planEndDate,
                address: {
                    code: orderData.address.code,
                    name: orderData.address.name
                },
                orderAmount: orderData.orderAmount,
                advancePercentage: orderData.advancePercentage || 0,
                advanceAmount: orderData.advanceAmount || 0,
                workTypeId: orderData.workType.id,
                serviceTypeId: 1,
                negotiable: orderData.negotiable,
                advanceInsurance: orderData.advanceInsurance,
                profileHidden: false, // always false
                published: orderData.published,
                fileRefs: fileRefs,
                details: []
            }
        };

        console.log('Order payload:', JSON.stringify(payload, null, 2));

        return await this.makeRequest(url, {
            method: 'POST',
            headers: {
                ...this.headers,
                'language': 'kk'
            },
            body: JSON.stringify(payload)
        });
    }

    /**
     * Upload files
     */
    async uploadFiles(fileList) {
        const uploadedFiles = [];
        for (const fileItem of fileList) {
            try {
                const formData = new FormData();
                formData.append('file', fileItem.file);
                const response = await fetch(`${CMR_API_BASE_URL}/rest/files`, {
                    method: 'POST',
                    headers: {
                        'Authorization': this.headers['Authorization']
                    },
                    body: formData
                });
                if (response.ok) {
                    const result = await response.json();
                    // result.fileRef, result.name, result.size
                    
                    // Determine file type based on MIME type
                    const isImage = fileItem.file.type.startsWith('image/');
                    const fileType = isImage ? 'IMAGE' : 'FILE';
                    
                    // Build OrderFileDto structure
                    const orderFileDto = {
                        type: fileType,
                        name: fileItem.file.name,
                        ref: result.fileRef,
                        url: 'https://cmrhubbucket.s3.us-east-1.amazonaws.com'
                    };
                    
                    uploadedFiles.push(orderFileDto);
                }
            } catch (error) {
                throw error;
            }
        }
        return uploadedFiles;
    }

    // === UTILITY METHODS ===

    /**
     * Search with debounce functionality
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Filter array by search text
     */
    filterBySearch(items, searchText, searchField = 'name') {
        if (!searchText) return items;
        
        const search = searchText.toLowerCase();
        return items.filter(item => {
            const value = typeof item[searchField] === 'object' 
                ? Object.values(item[searchField]).join(' ') 
                : item[searchField];
            return value.toLowerCase().includes(search);
        });
    }
}

// Create global instance
window.apiService = new ApiService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
