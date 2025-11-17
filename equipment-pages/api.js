/**
 * API Service for Equipment Management
 * Handles all API calls for machinery and equipment operations
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

    // === MACHINERY DICTIONARY API ===

    /**
     * Get machinery categories
     */
    async getCategories(searchText = '') {
        let url = `${API_BASE_URL}/dictionary/special-machinery?machineryTree=CATEGORY`;
        if (searchText) {
            url += `&search=${encodeURIComponent(searchText)}`;
        }
        return await this.makeRequest(url);
    }

    /**
     * Get machinery subcategories by parent category ID
     */
    async getSubcategories(parentId, searchText = '') {
        let url = `${API_BASE_URL}/dictionary/special-machinery?machineryTree=SUB_CATEGORY&parentId=${parentId}`;
        if (searchText) {
            url += `&search=${encodeURIComponent(searchText)}`;
        }
        return await this.makeRequest(url);
    }

    /**
     * Get machinery models/brands
     */
    async getModels(parentId, searchText = '') {
        // parentId is subcategory id
        let url = `${API_BASE_URL}/dictionary/special-machinery?machineryTree=MODEL&parentId=${parentId}`;
        if (searchText) {
            url += `&search=${encodeURIComponent(searchText)}`;
        }
        return await this.makeRequest(url);
    }

    /**
     * Get condition types
     */
    async getConditionTypes(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=CONDITION`;
        return await this.makeRequest(url);
    }

    /**
     * Get engine types
     */
    async getEngineTypes(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=ENGINE_TYPE`;
        return await this.makeRequest(url);
    }

    /**
     * Get steering types
     */
    async getSteeringTypes(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=STEERING`;
        return await this.makeRequest(url);
    }

    /**
     * Get rental periods
     */
    async getRentalPeriods(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=RENTAL_PERIOD`;
        return await this.makeRequest(url);
    }

    /**
     * Get years list (current year back to 1970)
     */
    async getYears() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= 1970; year--) {
            years.push({ code: year.toString(), name: year.toString() });
        }
        return years;
    }

    // === LOCATION API ===

    /**
     * Get addresses (regions, districts, cities)
     */
    async getAddresses(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/kato?katoType=REGION`;
        return await this.makeRequest(url);
    }

    // === EQUIPMENT PUBLISHING API ===

    /**
     * Publish equipment listing
     */
    async publishEquipment(equipmentData) {
        const url = `${CMR_API_BASE_URL}/rest/api/v1/machinery`;
        // Upload photos first and get refs/urls
        let photos = [];
        if (equipmentData.photos && equipmentData.photos.length > 0) {
            photos = await this.uploadPhotos(equipmentData.photos);
        }
        // Build payload as per the required structure
        const payload = {
            id: equipmentData.id || undefined,
            machineryCategory: equipmentData.category ? { id: equipmentData.category.id, name: equipmentData.category.name } : undefined,
            machinerySubCategory: equipmentData.subcategory ? { id: equipmentData.subcategory.id, name: equipmentData.subcategory.name } : undefined,
            machineryModel: equipmentData.model ? { id: equipmentData.model.id, name: equipmentData.model.name } : undefined,
            machineryModelExtended: equipmentData.modelExtended,
            machineryManufactureYear: equipmentData.year ? (equipmentData.year.code || equipmentData.year) : undefined,
            engineType: equipmentData.engineType ? { code: equipmentData.engineType.code, name: equipmentData.engineType.name } : undefined,
            steering: equipmentData.steering ? { code: equipmentData.steering.code, name: equipmentData.steering.name } : undefined,
            engineModel: equipmentData.engineModel,
            engineMass: equipmentData.weight ? Number(equipmentData.weight) : undefined,
            machineryCondition: equipmentData.condition ? { code: equipmentData.condition.code, name: equipmentData.condition.name } : undefined,
            comment: equipmentData.comments,
            rentalPeriod: equipmentData.rentalPeriod ? { code: equipmentData.rentalPeriod.code, name: equipmentData.rentalPeriod.name } : undefined,
            minimalTime: equipmentData.minHours ? Number(equipmentData.minHours) : undefined,
            isDriver: equipmentData.driverOperator,
            hasDocs: equipmentData.documentPackage,
            canTravelOut: equipmentData.regionTrips,
            hourCharge: equipmentData.negotiablePrice ? null : (equipmentData.hourlyRate ? Number(equipmentData.hourlyRate) : null),
            phones: [equipmentData.phone, ...(equipmentData.additionalPhone ? [equipmentData.additionalPhone] : [])],
            photos: photos,
            address: equipmentData.address ? { code: equipmentData.address.code || equipmentData.address.id, name: equipmentData.address.name } : undefined,
            machineryCharacteristics: equipmentData.machineryCharacteristics || []
        };

        return await this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Upload photos
     */
    async uploadPhotos(photoFiles) {
        const uploadedPhotos = [];
        for (const photo of photoFiles) {
            try {
                const formData = new FormData();
                formData.append('file', photo.file);
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
                    let url = '';
                    if (result.fileRef && result.fileRef.startsWith('s3://')) {
                        url = 'https://cmrhubbucket.s3.us-east-1.amazonaws.com/' + result.fileRef.substring(5);
                    }
                    uploadedPhotos.push({ ref: result.fileRef, url });
                }
            } catch (error) {
                throw error;
            }
        }
        return uploadedPhotos;
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