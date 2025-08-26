/**
 * Document Signing Logic
 * This file contains all the logic for the document signing page
 */

// API Configuration
const DEFAULT_DOCSIGN_CONFIG = {
    // API Base URL - can be overridden by environment variables
    //API_BASE_URL: 'http://localhost:8080',
    API_BASE_URL: 'https://cmr.test.api.stroyka.kz',
    
    // Endpoints
    SIGNATORY_ENDPOINT: '/rest/api/v1/aitu/sign-applications/by-signatory/',
    SIGNING_ENDPOINT: '/rest/api/v1/aitu/signable-pdf/',
    
    // Timeouts
    REQUEST_TIMEOUT: 30000, // 30 seconds
};

// Expose to browser when available (without breaking SSR/Node)
if (typeof window !== 'undefined') {
    window.DOCSIGN_CONFIG = window.DOCSIGN_CONFIG || DEFAULT_DOCSIGN_CONFIG;
}

// Safe accessor for configuration (works in browser and SSR/Node)
function getDocSignConfig() {
    if (typeof window !== 'undefined' && window.DOCSIGN_CONFIG) {
        return window.DOCSIGN_CONFIG;
    }
    if (typeof globalThis !== 'undefined' && globalThis.DOCSIGN_CONFIG) {
        return globalThis.DOCSIGN_CONFIG;
    }
    return DEFAULT_DOCSIGN_CONFIG;
}

// Function to get API base URL with environment variable support
function getDocSignApiBaseUrl() {
    // Check if API_BASE_URL is set via environment variable
    if (typeof window !== 'undefined' && window.API_BASE_URL) {
        console.log('Using API_BASE_URL from window:', window.API_BASE_URL);
        return window.API_BASE_URL;
    }
    
    // Check if it's set via meta tag
    let metaTagContent = null;
    if (typeof document !== 'undefined') {
        const metaTag = document.querySelector('meta[name="api-base-url"]');
        if (metaTag && metaTag.content) {
            metaTagContent = metaTag.content;
        }
    }
    if (metaTagContent) {
        console.log('Using API_BASE_URL from meta tag:', metaTagContent);
        return metaTagContent;
    }
    
    // Return default
    const cfg = getDocSignConfig();
    console.log('Using default API_BASE_URL:', cfg.API_BASE_URL);
    return cfg.API_BASE_URL;
}

// Helper to get full config (internal)
function _cfg() {
    return getDocSignConfig();
}

// Function to get full API URL
function getDocSignApiUrl(endpoint) {
    const baseUrl = getDocSignApiBaseUrl();
    return `${baseUrl}${endpoint}`;
}

// Helper to get PDF endpoint for sign application
function getFilesApiPdfUrl(signApplicationId) {
    // Endpoint as per backend controller mapping
    return getDocSignApiUrl(`/rest/api/v1/files/sign-applications/${signApplicationId}/pdf`);
}

// Normalize any provided URL or path to an absolute URL.
// - If it's already absolute (http/https), return as-is.
// - If it starts with //, prefix current protocol.
// - If it starts with '/rest/' or 'rest/', treat it as API endpoint and prefix DocSign API base.
// - Otherwise, make it absolute on current origin.
function resolveDocSignUrl(urlOrPath) {
    if (!urlOrPath) return urlOrPath;
    try {
        const val = String(urlOrPath).trim();
        if (/^https?:\/\//i.test(val)) return val;
        if (/^\/\//.test(val)) return `${window.location.protocol}${val}`;
        const apiBase = getDocSignApiBaseUrl().replace(/\/+$/,'');
        if (/^\/?rest\//i.test(val)) {
            const path = val.startsWith('/') ? val : `/${val}`;
            return `${apiBase}${path}`;
        }
        // Generic relative path -> absolute on current origin
        const absPath = val.startsWith('/') ? val : `/${val}`;
        return `${window.location.origin}${absPath}`;
    } catch (_) {
        return urlOrPath;
    }
}

// Function to extract UUID from URL path
function getSignatoryIdFromPath() {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname;
    const match = path.match(/\/sign\/document\/([^\/]+)$/);
    return match ? match[1] : null;
}

// Helper: get query parameter value
function getQueryParam(name) {
    try {
        if (typeof window === 'undefined' || !window.location || !window.location.search) return null;
        const params = new URLSearchParams(window.location.search);
        const val = params.get(name);
        return val && val.trim() !== '' ? val.trim() : null;
    } catch (e) {
        return null;
    }
}

// Helper: UUID detector and extractor
function isUuid(str) {
    return typeof str === 'string' && /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(str);
}
function extractUuid(str) {
    if (typeof str !== 'string') return null;
    const m = str.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    return m ? m[0] : null;
}

// Helper: get signApplicationId from URL query (supports several keys)
function getSignApplicationIdFromQuery() {
    return (
        getQueryParam('signApplicationId') ||
        getQueryParam('signApplicationUuid') ||
        getQueryParam('signAppId') ||
        getQueryParam('applicationId') ||
        getQueryParam('saId') ||
        getQueryParam('sa') ||
        getQueryParam('uuid') ||
        getQueryParam('id') ||
        null
    );
}

// Extract signApplicationId from backend data (robust, checks common locations)
function extractSignApplicationIdFromData(obj) {
    try {
        if (!obj || typeof obj !== 'object') return null;
        const candidates = [];
        const push = (v, from) => {
            if (typeof v === 'string' && v.trim()) {
                candidates.push({ id: v.trim(), from });
            }
        };
        // Top-level common keys
        push(obj.signApplicationId, 'data.signApplicationId');
        push(obj.signApplicationUuid, 'data.signApplicationUuid');
        push(obj.applicationId, 'data.applicationId');
        push(obj.signAppId, 'data.signAppId');
        // Some backends may simply put id at root (use low priority)
        if (obj.id) push(obj.id, 'data.id');
        if (obj.uuid) push(obj.uuid, 'data.uuid');
        // Nested: signApplication object
        if (obj.signApplication && typeof obj.signApplication === 'object') {
            push(obj.signApplication.id, 'data.signApplication.id');
            push(obj.signApplication.uuid, 'data.signApplication.uuid');
        }
        // Nested: signApplicationFile object
        if (obj.signApplicationFile && typeof obj.signApplicationFile === 'object') {
            const f = obj.signApplicationFile;
            push(f.signApplicationId, 'data.signApplicationFile.signApplicationId');
            push(f.applicationId, 'data.signApplicationFile.applicationId');
            if (f.signApplication && typeof f.signApplication === 'object') {
                push(f.signApplication.id, 'data.signApplicationFile.signApplication.id');
                push(f.signApplication.uuid, 'data.signApplicationFile.signApplication.uuid');
            }
            if (f.fileRefWithQr) {
                const u = extractUuid(String(f.fileRefWithQr));
                if (u) push(u, 'data.signApplicationFile.fileRefWithQr(uuid)');
            }
            if (f.fileRef) {
                const u = extractUuid(String(f.fileRef));
                if (u) push(u, 'data.signApplicationFile.fileRef(uuid)');
            }
        }
        // Also consider top-level fileRef fields if present
        if (obj.fileRefWithQr) {
            const u = extractUuid(String(obj.fileRefWithQr));
            if (u) push(u, 'data.fileRefWithQr(uuid)');
        }
        if (obj.fileRef) {
            const u = extractUuid(String(obj.fileRef));
            if (u) push(u, 'data.fileRef(uuid)');
        }
        // Generic shallow scan for keys that look like sign application id
        const likeKeys = ['signapplicationid','sign_application_id','signappId','signAppUuid','sign_application_uuid'];
        Object.keys(obj).forEach(k => {
            const v = obj[k];
            if (typeof v === 'string' && v && likeKeys.includes(String(k).toLowerCase())) {
                push(v, `data['${k}']`);
            }
        });
        if (candidates.length) {
            console.log('[DocSign] Candidates for signApplicationId from data:', candidates);
            return candidates[0].id;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Function to fetch signatory data
async function fetchSignatoryData(signatoryId) {
    try {
        const url = getDocSignApiUrl(_cfg().SIGNATORY_ENDPOINT + signatoryId);
        console.log('Fetching signatory data from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: _cfg().REQUEST_TIMEOUT
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Signatory data received:', data);
        return data;
    } catch (error) {
        console.error('Error fetching signatory data:', error);
        throw error;
    }
}

// Function to format date
function formatDate(dateString) {
    if (!dateString) return 'Не указано';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Не указано';
    }
}

// Language translations
const translations = {
    ru: {
        LLP: 'Юр. лицо',
        Person: 'Физ. лицо',
        iinBin: 'ИИН/БИН',
        iin: 'ИИН',
        notSpecified: 'Не указано',
        phone: 'Телефон',
        signedAt: 'Подписано',
        signButton: 'Подписать',
        signers: 'Подписанты',
        documentToSign: 'Документ для подписи',
        created: 'Создан',
        useApp: 'Для подписания документа используйте приложение Stroyka.kz',
        loading: 'Загрузка документа...',
        error: 'Ошибка',
        retry: 'Повторить',
        preparingSignature: 'Подготовка подписи...',
        downloadDoc: 'Скачать документ',
        openInNewWindow: 'Открыть документ в новом окне',
        signLinkNotReceived: 'Ссылка для подписи не получена',
        signingError: 'Ошибка при инициации подписи. Пожалуйста, попробуйте позже.',
        loadError: 'Не удалось загрузить документ. Пожалуйста, попробуйте позже.',
        signStates: {
            SIGNED: 'Подписано',
            PENDING: 'Ожидает подписи',
            REJECTED: 'Отклонено',
            EXPIRED: 'Истекло'
        }
    },
    kk: {
        LLP: 'Заңды тұлға',
        Person: 'Жеке тұлға',
        iinBin: 'ЖСН/БСН',
        iin: 'ЖСН',
        notSpecified: 'Көрсетілмеген',
        phone: 'Телефон',
        signedAt: 'Қол қойылды',
        signButton: 'Құжатқа қол қою',
        signers: 'Қол қоюшылар',
        documentToSign: 'Қол қою үшін құжат',
        created: 'Құрылған',
        useApp: 'Құжатқа қол қою үшін Stroyka.kz қосымшасын пайдаланыңыз',
        loading: 'Құжат жүктелуде...',
        error: 'Қате',
        retry: 'Қайталау',
        preparingSignature: 'Қолтаңба дайындалуда...',
        downloadDoc: 'Құжатты жүктеу',
        openInNewWindow: 'Құжатты жаңа терезеде ашу',
        signLinkNotReceived: 'Қол қою сілтемесі алынбады',
        signingError: 'Қол қою кезінде қате орын алды. Кейінірек қайталап көріңіз.',
        loadError: 'Құжатты жүктеу мүмкін болмады. Кейінірек қайталап көріңіз.',
        signStates: {
            SIGNED: 'Қол қойылды',
            PENDING: 'Қол қою күтілуде',
            REJECTED: 'Қабылданбады',
            EXPIRED: 'Мерзімі өтті'
        }
    }
};

let currentLanguage = 'ru';

// Function to get translation
function t(key) {
    return translations[currentLanguage][key] || key;
}

// Function to switch language
function switchLanguage(lang) {
    currentLanguage = lang;
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    // Re-render the page with new language
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeDocumentSigning);
        } else {
            initializeDocumentSigning();
        }
    }
}

// Function to get signer type and info
function getSignerInfo(signer) {
    if (signer.bin && signer.bin.trim() !== '') {
        return {
            type: t('LLP'),
            info: `${t('iinBin')}: ${signer.bin}`,
            name: signer.name || t('notSpecified')
        };
    } else {
        return {
            type: t('Person'),
            info: `${t('iin')}: ${signer.iin || t('notSpecified')}`,
            name: signer.name || t('notSpecified')
        };
    }
}

// Function to get sign state text
function getSignStateText(signState) {
    return translations[currentLanguage].signStates[signState] || signState;
}

// Function to get sign state class
function getSignStateClass(signState) {
    const classMap = {
        'SIGNED': 'signed',
        'PENDING': 'pending',
        'REJECTED': 'rejected',
        'EXPIRED': 'expired'
    };
    return classMap[signState] || 'pending';
}

// Simple IndexedDB helpers for caching PDF blobs
function openPdfDb(callback) {
    const dbName = 'pdfCache';
    const storeName = 'pdfs';
    const idb = (typeof indexedDB !== 'undefined') ? indexedDB
        : (typeof window !== 'undefined' && window.indexedDB) ? window.indexedDB
        : (typeof globalThis !== 'undefined' && globalThis.indexedDB) ? globalThis.indexedDB
        : null;
    if (!idb) { callback(null); return; }
    const request = idb.open(dbName, 1);
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
        }
    };
    request.onsuccess = function(event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            try { idb.deleteDatabase(dbName); } catch (e) { /* ignore */ }
            setTimeout(() => openPdfDb(callback), 50);
            return;
        }
        callback(db);
    };
    request.onerror = function() { callback(null); };
}

function savePdfToCache(blob, cacheKey) {
    openPdfDb(function(db) {
        if (!db) return;
        const tx = db.transaction('pdfs', 'readwrite');
        const store = tx.objectStore('pdfs');
        store.put(blob, cacheKey);
    });
}

function getCachedPdfUrl(cacheKey, callback) {
    openPdfDb(function(db) {
        if (!db) return callback(null);
        const tx = db.transaction('pdfs', 'readonly');
        const store = tx.objectStore('pdfs');
        const getReq = store.get(cacheKey);
        getReq.onsuccess = function(e) {
            const blob = e.target.result;
            if (blob) {
                callback(URL.createObjectURL(blob));
            } else {
                callback(null);
            }
        };
        getReq.onerror = function() { callback(null); };
    });
}

function loadAndDisplayPdf(pdfUrl, fileName) {
    const objectEl = document.getElementById('pdfObject');
    const iframeEl = document.getElementById('pdfFrame');
    const downloadLink = document.getElementById('downloadPdfLink');
    const newWindowLink = document.getElementById('openInNewWindowLink');

    // Set initial fallback links to direct URL
    if (newWindowLink) newWindowLink.href = pdfUrl;
    if (downloadLink) {
        downloadLink.href = pdfUrl;
        downloadLink.setAttribute('download', fileName || 'document.pdf');
    }

    getCachedPdfUrl(pdfUrl, function(cachedUrl) {
        const setViewerSrc = (url) => {
            if (objectEl) objectEl.setAttribute('data', url);
            if (iframeEl) iframeEl.setAttribute('src', url);
        };

        if (cachedUrl) {
            setViewerSrc(cachedUrl);
            if (downloadLink) downloadLink.href = cachedUrl;
            if (newWindowLink) newWindowLink.href = cachedUrl;
            return;
        }

        // Fetch the PDF as Blob
        fetch(pdfUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/pdf'
            }
        })
            .then(function(response) {
                if (!response.ok) throw new Error('PDF fetch error: ' + response.status);
                return response.blob();
            })
            .then(function(blob) {
                const blobUrl = URL.createObjectURL(blob);
                savePdfToCache(blob, pdfUrl);
                setViewerSrc(blobUrl);
                if (downloadLink) {
                    downloadLink.href = blobUrl;
                    downloadLink.setAttribute('download', fileName || 'document.pdf');
                }
                if (newWindowLink) {
                    newWindowLink.href = blobUrl;
                }
            })
            .catch(function(err) {
                console.warn('[DocSign] PDF fetch failed, falling back to direct URL:', err);
                // As a last resort, try to show direct URL (may download depending on headers)
                setViewerSrc(pdfUrl);
            });
    });
}

// Function to render the document signing page
function renderDocumentSigningPage(data) {
    const container = document.getElementById('documentContainer');
    let signatoryId = getSignatoryIdFromPath();

    if (!signatoryId) {
        signatoryId = "0198990b-c489-70b5-bba0-4bf6058bb068";
    }
    
    // Find current signer - the one whose ID matches the signatoryId in URL
    const currentSigner = data.signers.find(signer => signer.id === signatoryId);
    const isCurrentUserSigning = currentSigner !== undefined;
    
    // Get file info (defensive in case backend omits it)
    const fileInfo = (data && data.signApplicationFile) || {};
    
    // Sort signers - main signer first, then others
    const sortedSigners = [...data.signers].sort((a, b) => {
        if (a.isMainSigner && !b.isMainSigner) return -1;
        if (!a.isMainSigner && b.isMainSigner) return 1;
        return 0;
    });
    
    // Create HTML content
    let html = `
        <div class="signers-section">
            <h3>${t('signers')}</h3>
            <div class="signers-list">
    `;
    
    sortedSigners.forEach(signer => {
        const signerInfo = getSignerInfo(signer);
        const isCurrentSigner = signer.id === signatoryId;
        const signStateClass = getSignStateClass(signer.signState);
        const signStateText = getSignStateText(signer.signState);
        
        html += `
            <div class="signer-item ${isCurrentSigner ? 'current-signer' : ''} ${signStateClass}">
                <div class="signer-header">
                    <div class="signer-type">${signerInfo.type}</div>
                    <div class="sign-state ${signStateClass}">${signStateText}</div>
                </div>
                <div class="signer-details">
                    <div class="signer-name">${signerInfo.name}</div>
                    <div class="signer-id">${signerInfo.info}</div>
                    <div class="signer-phone">${t('phone')}: ${signer.phone || t('notSpecified')}</div>
                    ${signer.signedTime ? `<div class="signed-time">${t('signedAt')}: ${formatDate(signer.signedTime)}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
        
        <div class="document-info">
            ${isCurrentUserSigning && currentSigner.signState === 'PENDING' ? `
                <div class="sign-button-container">
                    <button class="sign-button" onclick="initiateSigning('${currentSigner.id}')">${t('signButton')}</button>
                </div>
            ` : ''}
            <h2>${t('documentToSign')}</h2>
            <div class="file-details">
                <div class="file-name">${fileInfo.fileName || t('notSpecified')}</div>
                <div class="file-date">${t('created')}: ${formatDate(data.createdDate)}</div>
            </div>
            <div class="pdf-viewer">
                <object id="pdfObject" type="application/pdf" width="100%" height="600"></object>
            </div>
            <div class="pdf-fallback">
                <a id="openInNewWindowLink" class="download-link" target="_blank" rel="noopener">${t('openInNewWindow')}</a>
            </div>
            <div class="pdf-fallback">
                <a id="downloadPdfLink" class="download-link">${t('downloadDoc')}</a>
            </div>
        </div>
        
        <div class="action-section">
            ${isCurrentUserSigning && currentSigner.signState === 'PENDING' ? `
                <div class="sign-action">
                    <p>${t('useApp')}</p>
                    <div class="app-buttons">
                        <a href="https://apps.apple.com/us/app/stroyka-kz/id6742178994" class="app-button app-store">
                            <svg class="store-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                            </svg>
                            App Store
                        </a>
                        <a href="https://play.google.com/store/apps/details?id=kz.cmrhub" class="app-button play-store">
                            <svg class="store-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                            </svg>
                            Google Play
                        </a>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    container.innerHTML = html;

    // Prefer signApplicationId from URL query; then from payload; fall back to direct fileRef URLs only if needed
    const signAppIdFromQuery = getSignApplicationIdFromQuery();
    const signAppIdFromData = extractSignApplicationIdFromData(data) || extractSignApplicationIdFromData(fileInfo);

    if (!signAppIdFromQuery && !signAppIdFromData) {
        console.warn('[DocSign] No signApplicationId found in query or data; will try fileRef fields if present');
    } else {
        console.log('[DocSign] signApplicationId sources:', { signAppIdFromQuery, signAppIdFromData });
    }

    const signAppId = signAppIdFromQuery || signAppIdFromData;

    if (signAppId) {
        const apiPdfUrl = resolveDocSignUrl(getFilesApiPdfUrl(signAppId));
        console.log('[DocSign] Inline files endpoint will be called with signApplicationId:', { signAppId, fromQuery: !!signAppIdFromQuery, apiPdfUrl });
        if (typeof window !== 'undefined') {
            window.DEBUG_DocSign = window.DEBUG_DocSign || {};
            window.DEBUG_DocSign.state = { signAppIdFromQuery, signAppIdFromData, chosenSignAppId: signAppId, apiPdfUrl };
            window.DEBUG_DocSign.loadPdfFor = function(id) {
                const u = resolveDocSignUrl(getFilesApiPdfUrl(id));
                console.log('[DocSign][DEBUG] Forced inline PDF load for id:', id, 'url:', u);
                loadAndDisplayPdf(u, fileInfo && fileInfo.fileName);
            };
        }
        loadAndDisplayPdf(apiPdfUrl, fileInfo && fileInfo.fileName);
    } else {
        const rawPdfUrl = (fileInfo && (fileInfo.fileRefWithQr || fileInfo.fileRef)) || null;
        if (rawPdfUrl) {
            const uuidFromRaw = extractUuid(String(rawPdfUrl));
            if (uuidFromRaw) {
                const inlineUrl = resolveDocSignUrl(getFilesApiPdfUrl(uuidFromRaw));
                console.log('[DocSign] Derived signApplicationId from fileRef; calling inline endpoint:', { rawPdfUrl, uuidFromRaw, inlineUrl });
                if (typeof window !== 'undefined') {
                    window.DEBUG_DocSign = window.DEBUG_DocSign || {};
                    window.DEBUG_DocSign.state = { signAppIdFromQuery, signAppIdFromData, chosenSignAppId: uuidFromRaw, derivedFrom: 'fileRef', rawPdfUrl, apiPdfUrl: inlineUrl };
                    window.DEBUG_DocSign.loadPdfFor = function(id) {
                        const u = resolveDocSignUrl(getFilesApiPdfUrl(id));
                        console.log('[DocSign][DEBUG] Forced inline PDF load for id:', id, 'url:', u);
                        loadAndDisplayPdf(u, fileInfo && fileInfo.fileName);
                    };
                }
                loadAndDisplayPdf(inlineUrl, fileInfo && fileInfo.fileName);
            } else {
                const absPdfUrl = resolveDocSignUrl(rawPdfUrl);
                console.log('[DocSign] Falling back to direct fileRef URL (no signApplicationId available):', { absPdfUrl, fileRefWithQr: fileInfo && fileInfo.fileRefWithQr, fileRef: fileInfo && fileInfo.fileRef });
                if (typeof window !== 'undefined') {
                    window.DEBUG_DocSign = window.DEBUG_DocSign || {};
                    window.DEBUG_DocSign.state = { signAppIdFromQuery, signAppIdFromData, chosenSignAppId: null, rawPdfUrl, absPdfUrl };
                    window.DEBUG_DocSign.loadPdfFor = function(id) {
                        const u = resolveDocSignUrl(getFilesApiPdfUrl(id));
                        console.log('[DocSign][DEBUG] Forced inline PDF load for id:', id, 'url:', u);
                        loadAndDisplayPdf(u, fileInfo && fileInfo.fileName);
                    };
                }
                loadAndDisplayPdf(absPdfUrl, fileInfo && fileInfo.fileName);
            }
        } else {
            console.warn('[DocSign] No PDF URL or signApplicationId available to load PDF');
            if (typeof window !== 'undefined') {
                window.DEBUG_DocSign = window.DEBUG_DocSign || {};
                window.DEBUG_DocSign.state = { signAppIdFromQuery, signAppIdFromData, chosenSignAppId: null };
                window.DEBUG_DocSign.loadPdfFor = function(id) {
                    const u = resolveDocSignUrl(getFilesApiPdfUrl(id));
                    console.log('[DocSign][DEBUG] Forced inline PDF load for id:', id, 'url:', u);
                    loadAndDisplayPdf(u, fileInfo && fileInfo.fileName);
                };
            }
        }
    }
}

// Function to show error
function showError(message) {
    const container = document.getElementById('documentContainer');
    container.innerHTML = `
        <div class="error-container">
            <h2>${t('error')}</h2>
            <p>${message}</p>
            <button onclick="window.location.reload()" class="retry-button">${t('retry')}</button>
        </div>
    `;
}

// Function to show loading
function showLoading() {
    const container = document.getElementById('documentContainer');
    container.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>${t('loading')}</p>
        </div>
    `;
}

// Function to initiate signing process
async function initiateSigning(signatoryId) {
    try {
        // Show loading state
        const signButton = document.querySelector('.sign-button');
        if (signButton) {
            signButton.disabled = true;
            signButton.textContent = t('preparingSignature');
        }
        
        // Call the signing endpoint
        const url = getDocSignApiUrl(_cfg().SIGNING_ENDPOINT + signatoryId + '/process');
        console.log('Initiating signing process:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: _cfg().REQUEST_TIMEOUT
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Signing response received:', data);
        
        // Redirect to the sign link
        if (data.signLink) {
            window.location.href = data.signLink;
        } else {
            throw new Error(t('signLinkNotReceived'));
        }
        
    } catch (error) {
        console.error('Error initiating signing:', error);
        alert(t('signingError'));
        
        // Reset button state
        const signButton = document.querySelector('.sign-button');
        if (signButton) {
            signButton.disabled = false;
            signButton.textContent = t('signButton');
        }
    }
}

// Function to initialize language buttons
function initializeLanguageButtons() {
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchLanguage(btn.dataset.lang);
        });
    });
    
    // Set initial active state
    const activeButton = document.querySelector(`[data-lang="${currentLanguage}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Main initialization function
function updateEndpointInfo(signatoryId) {
    try {
        const el = document.getElementById('endpointInfo');
        if (!el) return;
        const base = getDocSignApiBaseUrl();
        const signatoryFull = getDocSignApiUrl(_cfg().SIGNATORY_ENDPOINT + (signatoryId || '...'));
        const signingFull = getDocSignApiUrl(_cfg().SIGNING_ENDPOINT + (signatoryId || '...') + '/process');
        el.textContent = `Endpoint: ${signatoryFull} | Signing: ${signingFull}`;
    } catch (_) { /* silent */ }
}

async function initializeDocumentSigning() {
    try {
        showLoading();

        // Early PDF load if signApplicationId is provided via query params
        const signAppIdFromQuery = getSignApplicationIdFromQuery();
        if (signAppIdFromQuery) {
            const apiPdfUrl = resolveDocSignUrl(getFilesApiPdfUrl(signAppIdFromQuery));
            console.log('[DocSign] Early PDF load via query signApplicationId:', { signApplicationId: signAppIdFromQuery, apiPdfUrl });
            if (typeof window !== 'undefined') {
                window.DEBUG_DocSign = window.DEBUG_DocSign || {};
                window.DEBUG_DocSign.earlyPdf = { signApplicationId: signAppIdFromQuery, url: apiPdfUrl, at: new Date().toISOString() };
                window.DEBUG_DocSign.loadPdfFor = function(id) {
                    const u = resolveDocSignUrl(getFilesApiPdfUrl(id));
                    console.log('[DocSign][DEBUG] Forced inline PDF load for id:', id, 'url:', u);
                    loadAndDisplayPdf(u);
                };
            }
            // This will fetch the PDF and log the Blob in console; viewer will be set once available or fallback silently
            loadAndDisplayPdf(apiPdfUrl);
        }
        
        let signatoryId = getSignatoryIdFromPath();
        if (!signatoryId) {
            signatoryId = "0198990b-c489-70b5-bba0-4bf6058bb068";
        }

        updateEndpointInfo(signatoryId);
        
        const data = await fetchSignatoryData(signatoryId);
        renderDocumentSigningPage(data);
        initializeLanguageButtons();
        
    } catch (error) {
        console.error('Error initializing document signing:', error);
        showError(t('loadError'));
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getDocSignApiBaseUrl,
        getDocSignApiUrl,
        getSignatoryIdFromPath,
        fetchSignatoryData,
        renderDocumentSigningPage,
        initializeDocumentSigning,
        initiateSigning
    };
}
