// Example Cloudflare Worker for advanced routing and caching
// Deploy this separately using Cloudflare Workers
// This sits in front of your Docker container

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const cache = caches.default

  // Cache static assets aggressively
  if (url.pathname.startsWith('/_next/static/')) {
    // Check cache first
    let response = await cache.match(request)
    if (response) {
      return response
    }

    // Fetch from origin
    response = await fetch(request)
    
    // Cache for 1 year
    const cacheResponse = new Response(response.body, response)
    cacheResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    event.waitUntil(cache.put(request, cacheResponse.clone()))
    
    return cacheResponse
  }

  // Cache API responses briefly
  if (url.pathname.startsWith('/api/')) {
    // Skip caching for authentication endpoints
    const skipCache = [
      '/api/auth/',
      '/api/user/',
      '/api/preferences/'
    ].some(path => url.pathname.startsWith(path))

    if (skipCache) {
      return fetch(request)
    }

    // Check cache
    let response = await cache.match(request)
    if (response) {
      return response
    }

    // Fetch and cache for 60 seconds
    response = await fetch(request)
    const cacheResponse = new Response(response.body, response)
    cacheResponse.headers.set('Cache-Control', 'public, max-age=60')
    event.waitUntil(cache.put(request, cacheResponse.clone()))
    
    return cacheResponse
  }

  // Pass through everything else
  return fetch(request)
}

// Alternative: More advanced Worker with rate limiting
class AdvancedWorker {
  constructor() {
    this.originUrl = 'https://your-origin-server.com'
  }

  async handleRequest(request) {
    const url = new URL(request.url)
    
    // Rate limiting check (requires Workers KV)
    const rateLimitCheck = await this.checkRateLimit(request)
    if (!rateLimitCheck.allowed) {
      return new Response('Rate limit exceeded', { 
        status: 429,
        headers: { 'Retry-After': '60' }
      })
    }

    // Geographic routing
    const country = request.cf?.country
    if (country === 'CN') {
      // Route to China-specific origin
      return this.routeToOrigin(request, 'https://cn-origin.com')
    }

    // A/B testing
    const variant = Math.random() < 0.5 ? 'A' : 'B'
    const response = await this.routeToOrigin(request, this.originUrl)
    
    // Add custom headers
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('X-Variant', variant)
    newResponse.headers.set('X-Country', country || 'unknown')
    
    return newResponse
  }

  async checkRateLimit(request) {
    // Implement rate limiting using Workers KV
    const ip = request.headers.get('CF-Connecting-IP')
    // ... rate limiting logic ...
    return { allowed: true }
  }

  async routeToOrigin(request, originUrl) {
    const url = new URL(request.url)
    url.hostname = new URL(originUrl).hostname
    url.protocol = 'https:'
    
    const newRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
    
    return fetch(newRequest)
  }
}

// To use the advanced worker:
// const worker = new AdvancedWorker()
// addEventListener('fetch', event => {
//   event.respondWith(worker.handleRequest(event.request))
// })

