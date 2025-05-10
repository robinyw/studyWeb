addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  let response

  try {
    // Serve index.html for root path
    if (url.pathname === '/') {
      response = await fetch('index.html')
    } else {
      // Serve other static files
      response = await fetch(url.pathname.slice(1))
    }

    // Get the file extension
    const extension = url.pathname.split('.').pop() || 'html'

    // Set appropriate content type
    const contentType = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'json': 'application/json'
    }[extension] || 'text/plain'

    // Clone the response to modify headers
    const newResponse = new Response(response.body, response)
    newResponse.headers.set('Content-Type', contentType)

    return newResponse
  } catch (error) {
    return new Response(`Error: ${error.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
