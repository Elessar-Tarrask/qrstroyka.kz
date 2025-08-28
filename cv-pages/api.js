/**
 * API Service for CV Management
 * Handles all API calls for CV creation and operations
 */

const API_BASE_URL = 'https://dictionary.test.api.stroyka.kz/api/v1';
const CMR_API_BASE_URL = 'https://cmr.test.api.stroyka.kz';

class CVApiService {
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

    // === CV DICTIONARY API ===

    /**
     * Get work schedule options
     */
    async getWorkSchedule() {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=WORK_SCHEDULE`;
        return await this.makeRequest(url);
    }

    /**
     * Get cities/regions from KATO
     */
    async getCities() {
        const url = `${API_BASE_URL}/dictionary/kato?katoType=REGION`;
        return await this.makeRequest(url);
    }

    /**
     * Get CV categories/industries
     */
    async getIndustries(searchText = '') {
        let url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=INDUSTRY`;
        if (searchText) {
            url += `&search=${encodeURIComponent(searchText)}`;
        }
        return await this.makeRequest(url);
    }

    /**
     * Get position/job titles
     */
    async getPositions(searchText = '') {
        let url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=POSITION`;
        if (searchText) {
            url += `&search=${encodeURIComponent(searchText)}`;
        }
        return await this.makeRequest(url);
    }

    /**
     * Get experience levels
     */
    async getExperienceLevels(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=EXPERIENCE_LEVEL`;
        return await this.makeRequest(url);
    }

    /**
     * Get education levels
     */
    async getEducationLevels(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=EDUCATION_LEVEL`;
        return await this.makeRequest(url);
    }

    /**
     * Get employment types
     */
    async getEmploymentTypes(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=EMPLOYMENT_TYPE`;
        return await this.makeRequest(url);
    }

    /**
     * Get professions
     */
    async getProfessions() {
        const url = `${API_BASE_URL}/dictionary/simple/id?dictionaryName=PROFESSION`;
        return await this.makeRequest(url);
    }

    /**
     * Get skills/competencies
     */
    async getSkills() {
        const url = `${API_BASE_URL}/dictionary/simple/id?dictionaryName=SKILL`;
        return await this.makeRequest(url);
    }

    /**
     * Get universities
     */
    async getUniversities() {
        const url = `${API_BASE_URL}/dictionary/simple/id?dictionaryName=UNIVERSITY`;
        return await this.makeRequest(url);
    }

    /**
     * Get specialties
     */
    async getSpecialties() {
        const url = `${API_BASE_URL}/dictionary/simple/id?dictionaryName=SPECIALITY`;
        return await this.makeRequest(url);
    }

    /**
     * Get education types
     */
    async getEducationTypes() {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=EDUCATION`;
        return await this.makeRequest(url);
    }

    /**
     * Get vehicle categories for driver licenses
     */
    async getVehicleCategories() {
        const url = `${API_BASE_URL}/dictionary/vehicle-categories`;
        return await this.makeRequest(url);
    }

    /**
     * Get languages
     */
    async getLanguages(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=LANGUAGES`;
        return await this.makeRequest(url);
    }

    /**
     * Get language proficiency levels
     */
    async getLanguageProficiency(language = 'kk') {
        const url = `${API_BASE_URL}/dictionary/simple/code?dictionaryName=LANGUAGE_PROFICIENCY`;
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

    // === CV PUBLISHING API ===

    /**
     * Create CV
     */
    async createCV(cvData) {
        const url = `${CMR_API_BASE_URL}/rest/api/v1/cv`;

        const payload = {
            requestBody: cvData
        }

        return await this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    /**
     * Publish CV
     */
    async publishCV(cvId) {
        const url = `${CMR_API_BASE_URL}/rest/api/v1/cv/publish?id=${cvId}`;
        return await this.makeRequest(url, {
            method: 'PUT'
        });
    }

    /**
     * Upload photo
     */
          async uploadPhoto(photoFile) {
          try {
              const formData = new FormData();
              formData.append('file', photoFile);
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
                return { ref: result.fileRef, url };
            }
        } catch (error) {
            throw error;
        }
        return null;
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

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone format
     */
    isValidPhone(phone) {
        const phoneRegex = /^7\d{10}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    /**
     * Format date for API
     */
    formatDate(date) {
        if (!date) return null;
        if (typeof date === 'string') return date;
        return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
}

// Create global instance
window.apiService = new CVApiService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CVApiService;
}
