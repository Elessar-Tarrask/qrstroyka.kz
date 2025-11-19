// API Configuration
const DEFAULT_COMPANY_CONFIG = {
    // API Base URL - can be overridden by environment variables
    API_BASE_URL: 'https://cmr.test.api.stroyka.kz',
    // API_BASE_URL: 'http://localhost:8080',
    // API_BASE_URL: 'https://cmr.test.api.stroyka.kz',

    // Endpoints
    COMPANY_ENDPOINT: '/rest/api/v1/analytics/company/',

    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
};

// Order API Service
class CompanyAPIService {
    constructor(config = DEFAULT_COMPANY_CONFIG) {
        this.config = config;
    }

    async getCompanyById(id) {
        const url = `${this.config.API_BASE_URL}${this.config.COMPANY_ENDPOINT}${id}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.REQUEST_TIMEOUT);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching company data:', error);
            throw error;
        }
    }
}

// Initialize API service
const companyAPI = new CompanyAPIService();