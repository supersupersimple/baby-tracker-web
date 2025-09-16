// Baby Tracker Service Worker
// Provides offline functionality and caching for PWA

const CACHE_NAME = 'baby-tracker-v2';
const STATIC_CACHE_NAME = 'baby-tracker-static-v2';
const DYNAMIC_CACHE_NAME = 'baby-tracker-dynamic-v2';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
  // Next.js static files will be cached dynamically
];

// API routes that should be cached
const API_CACHE_ROUTES = [
  '/api/babies',
  '/api/activities'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  // Installing service worker v2
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        // Caching static assets
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        // Failed to cache static assets
      })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  // Activating service worker
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that don't match current version
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName !== CACHE_NAME) {
            // Deleting old cache
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests with different strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static Next.js assets - Cache First
    event.respondWith(handleStaticAssets(request));
  } else if (url.pathname === '/' || url.pathname.startsWith('/auth') || url.pathname === '/offline') {
    // HTML pages - Network First with offline fallback
    event.respondWith(handlePageRequest(request));
  } else {
    // Other assets - Cache First with network fallback
    event.respondWith(handleOtherAssets(request));
  }
});

// Network First strategy for API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, cache the response for offline use
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Network request failed, trying cache
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a critical API call, return a meaningful response
    if (url.pathname.includes('/api/activities')) {
      return new Response(JSON.stringify({
        success: true,
        data: [],
        offline: true,
        message: 'Offline mode - showing local data only'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.pathname.includes('/api/babies')) {
      return new Response(JSON.stringify({
        success: true,
        data: [],
        offline: true,
        message: 'Offline mode - no baby data available'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For other API calls, return generic offline response
    return new Response(JSON.stringify({
      success: false,
      error: 'Offline - this feature requires internet connection',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Cache First strategy for static assets (but skip JavaScript to avoid caching issues)
async function handleStaticAssets(request) {
  try {
    const url = new URL(request.url);
    
    // Skip caching for JavaScript files to ensure we always get latest version
    if (url.pathname.includes('.js') || url.pathname.includes('webpack')) {
      // Skipping cache for JS file
      return fetch(request);
    }
    
    // Check cache first for non-JS assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, fetch from network and cache
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Static asset request failed
    // For critical assets, we might want to return a placeholder
    throw error;
  }
}

// Network First strategy for HTML pages with offline fallback
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Page request failed, trying cache
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page as last resort
    const offlineResponse = await caches.match('/offline');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // If no offline page, return a basic offline message
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Baby Tracker</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
            .offline-message { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 4em; margin-bottom: 20px; }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.5; }
            .retry-btn { 
              background: #3b82f6; color: white; border: none; 
              padding: 12px 24px; border-radius: 8px; 
              font-size: 16px; cursor: pointer; margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>Baby Tracker is currently offline. Your local data is still available, but you'll need an internet connection for syncing.</p>
            <button class="retry-btn" onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Cache First strategy for other assets
async function handleOtherAssets(request) {
  try {
    // Check cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Asset request failed
    throw error;
  }
}

// Background Sync for offline activities
self.addEventListener('sync', (event) => {
  if (event.tag === 'baby-tracker-sync') {
    // Background sync triggered
    event.waitUntil(syncOfflineActivities());
  }
});

// Sync offline activities when connection is restored
async function syncOfflineActivities() {
  try {
    // This will be handled by the main app's sync service
    // We just trigger the sync by posting a message to all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_TRIGGERED',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_API_RESPONSE') {
    // Cache API responses sent from the main app
    const { url, response } = event.data;
    caches.open(DYNAMIC_CACHE_NAME).then(cache => {
      cache.put(url, new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  }
});

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  // Push message received
  
  // For now, just log - can be extended for feeding reminders etc.
  const options = {
    body: 'Baby Tracker notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png'
  };
  
  event.waitUntil(
    self.registration.showNotification('Baby Tracker', options)
  );
});