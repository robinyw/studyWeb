import { getAssetFromKV } from '@cloudflare/kv-asset-handler'

addEventListener('fetch', event => {
  event.respondWith(handleEvent(event))
})

async function handleEvent(event) {
  try {
    // Try to get the asset from KV
    return await getAssetFromKV(event, {
      cacheControl: {
        browserTTL: 60 * 60 * 24, // 1 day
        edgeTTL: 60 * 60 * 24 * 365 // 365 days
      }
    })
  } catch (e) {
    // Fall back to serving index.html on errors
    if (e.status === 404) {
      return getAssetFromKV(event, {
        mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/index.html`, req)
      })
    }
    return new Response(e.message || 'Error', { status: e.status || 500 })
  }
}
