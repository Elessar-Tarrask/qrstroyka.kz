// API Configuration
const DEFAULT_EQUIPMENT_ORDER_CONFIG = {
    API_BASE_URL: 'https://cmr.api.stroyka.kz',
    ORDER_ENDPOINT: '/rest/api/v1/order/special-machinery/reg/',
    REQUEST_TIMEOUT: 30000,
};

// Order API Service for Equipment Orders
class EquipmentOrderAPIService {
    constructor(config = DEFAULT_EQUIPMENT_ORDER_CONFIG) {
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
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching equipment order data:', error);
            throw error;
        }
    }
}

// Initialize API service
const equipmentOrderAPI = new EquipmentOrderAPIService();

// UI rendering for /equipment-order/ deep link
document.addEventListener('DOMContentLoaded', async function() {
    const path = window.location.pathname;
    const deepLinkContent = document.getElementById('deepLinkContent');
    const defaultContent = document.getElementById('defaultContent');

    // Extract order reg number from URL path
    const orderPattern = /^\/equipment-order\/([^\/]+)$/;
    const match = path.match(orderPattern);
    if (match && match[1]) {
        const regNumber = match[1];
        defaultContent.style.display = 'none';
        showLoading();
        try {
            const orderData = await equipmentOrderAPI.getOrderByRegNumber(regNumber);
            displayOrderData(orderData);
        } catch (error) {
            showError('Не удалось загрузить данные заказа. Проверьте подключение к интернету.');
        }
    } else {
        deepLinkContent.style.display = 'none';
    }
});

function showLoading() {
    const deepLinkContent = document.getElementById('deepLinkContent');
    deepLinkContent.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Загружаем данные заказа...</p>
            </div>
        `;
}

function showError(message) {
    const deepLinkContent = document.getElementById('deepLinkContent');
    deepLinkContent.innerHTML = `
            <div class="error-message">
                ${message}
            </div>
            <div class="deep-link-container">
                <div class="deep-link-message">
                    Скачайте приложение для просмотра заказа и техники
                </div>
                <p style="color: #666; margin-bottom: 1.5rem;">
                    Для полного доступа скачайте мобильное приложение Stroyka.kz
                </p>
            </div>
        `;
}

function displayOrderData(order) {
    const deepLinkContent = document.getElementById('deepLinkContent');
    const category = order.categories?.category?.name || '';
    const subcategory = order.categories?.subcategory?.name || '';
    const categoriesHtml = (category || subcategory) ? `
        <div class="order-categories">
            ${category ? `<div class="category-pill">${category}</div>` : ''}
            ${subcategory ? `<div class="category-pill">${subcategory}</div>` : ''}
        </div>` : '';
    deepLinkContent.innerHTML = `
        <div class="order-container">
            <div class="order-header">
                <div>
                    <div class="order-amount">${order.orderAmount || '-'}${order.negotiable ? ' <span style=\"font-size:0.95rem;color:#2AAF54;font-weight:600;\">(Договорная)</span>' : ''}</div>
                    <div class="order-type">${order.name || ''}</div>
                </div>
                <div style="min-width:90px;text-align:right;">
                    <span style="font-size:0.93rem;color:#888;">#${order.regNumber || ''}</span><br>
                    <span style="font-size:0.83rem;color:#bababa;">${order.viewCount ? `👁 ${order.viewCount}` : ''}</span>
                </div>
            </div>
            ${categoriesHtml}
            <div class="order-details">
                <div class="details-title">Детали заказа</div>
                <div class="detail-row">
                    <span class="detail-label">Город</span>
                    <span class="detail-value">${order.address?.name || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Планируемый срок</span>
                    <span class="detail-value">${order.plannedDate || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Аванс</span>
                    <span class="detail-value">${order.advanceAmount || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Дата создания</span>
                    <span class="detail-value">${order.createdDate || '-'}</span>
                </div>
            </div>
            <div class="order-details">
                <div class="details-title">Описание</div>
                <div class="description-text">${order.description || '-'}</div>
            </div>
            <div class="order-details">
                <div class="details-title">Заказчик</div>
                <div class="detail-row" style="align-items:flex-start;flex-direction:column;gap:5px;">
                    <span class="detail-label">Имя:</span>
                    <span class="detail-value">${order.userInfo?.name || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Телефон:</span>
                    <span class="detail-value"><a href="#" onclick="showDownloadModal(); return false;" style="color: #007AFF; font-style: italic; text-decoration: underline; cursor: pointer; font-size: 0.9rem;">скачайте приложение чтобы увидеть</a></span>
                </div>
            </div>
        </div>
    `;
}

// Modal helpers for phone
function showDownloadModal() {
    document.getElementById('downloadModal').classList.add('show');
}
function closeDownloadModal() {
    document.getElementById('downloadModal').classList.remove('show');
}