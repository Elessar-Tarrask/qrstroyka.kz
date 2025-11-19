// API Configuration
const DEFAULT_RESUME_CONFIG = {
    // API Base URL - use test API by default; can be overridden later if needed
    API_BASE_URL: 'https://cmr.test.api.stroyka.kz',
    // API_BASE_URL: 'http://localhost:8080',
    // API_BASE_URL: 'https://cmr.test.api.stroyka.kz',
    // Endpoints
    RESUME_ENDPOINT: '/rest/api/v1/cv/reg/',

    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
};

// Resume API Service
class ResumeAPIService {
    constructor(config = DEFAULT_RESUME_CONFIG) {
        this.config = config;
    }

    async getResumeByRegNumber(regNumber) {
        const url = `${this.config.API_BASE_URL}${this.config.RESUME_ENDPOINT}${regNumber}`;

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
            console.error('Error fetching resume data:', error);
            throw error;
        }
    }
}

// Initialize API service
const resumeAPI = new ResumeAPIService();