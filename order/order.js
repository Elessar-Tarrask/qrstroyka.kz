// API Configuration
const DEFAULT_ORDER_CONFIG = {
    // API Base URL - can be overridden by environment variables
    API_BASE_URL: 'https://cmr.test.api.stroyka.kz',
    // API_BASE_URL: 'https://cmr.test.api.stroyka.kz',
    
    // Endpoints
    ORDER_ENDPOINT: '/rest/api/v1/order/reg/',
    
    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
};

// Order API Service
class OrderAPIService {
    constructor(config = DEFAULT_ORDER_CONFIG) {
        this.config = config;
    }

    async getOrderByRegNumber(regNumber) {
        const url = `${this.config.API_BASE_URL}${this.config.ORDER_ENDPOINT}${regNumber}`;
        
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
            console.error('Error fetching order data:', error);
            throw error;
        }
    }
}

// Initialize API service
const orderAPI = new OrderAPIService();