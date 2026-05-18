const ORIGIN_ENDPOINT = "https://cn123.zistgpt.com:8585";

const EXCLUDED_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

export default async function handleRequest(incomingRequest) {
  try {
    const requestUrl = new URL(incomingRequest.url);
    
    // Check if path contains "cheshmabi"
    if (!requestUrl.pathname.includes("cheshmabi")) {
      // Beautiful Hello World page
      const welcomePage = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    color: white;
                }
                .container {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
                    animation: fadeIn 1.5s ease-in;
                }
                h1 {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    animation: slideDown 0.8s ease-out;
                }
                p {
                    font-size: 1.2rem;
                    opacity: 0.9;
                    animation: slideUp 0.8s ease-out;
                }
                .emoji {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    animation: bounce 2s infinite;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="emoji">🌍✨</div>
                <h1>Hello World!</h1>
                <p>Welcome to our beautiful corner of the internet</p>
                <p style="font-size: 0.9rem; margin-top: 1rem;">✨ Have a wonderful day! ✨</p>
            </div>
        </body>
        </html>
      `;
      
      return new Response(welcomePage, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // If cheshmabi is in the path, proceed with proxy
    const destinationUrl = ORIGIN_ENDPOINT + requestUrl.pathname + requestUrl.search;

    const cleanedHeaders = new Headers();
    let visitorAddress = null;

    for (const [headerName, headerValue] of incomingRequest.headers) {
      const normalizedKey = headerName.toLowerCase();
      if (EXCLUDED_HEADERS.has(normalizedKey)) continue;
      if (normalizedKey.startsWith("x-nf-")) continue;
      if (normalizedKey.startsWith("x-netlify-")) continue;
      if (normalizedKey === "x-real-ip") {
        visitorAddress = headerValue;
        continue;
      }
      if (normalizedKey === "x-forwarded-for") {
        if (!visitorAddress) visitorAddress = headerValue;
        continue;
      }
      cleanedHeaders.set(normalizedKey, headerValue);
    }

    if (visitorAddress) cleanedHeaders.set("x-forwarded-for", visitorAddress);

    const httpMethod = incomingRequest.method;
    const supportsBody = httpMethod !== "GET" && httpMethod !== "HEAD";

    const requestConfig = {
      method: httpMethod,
      headers: cleanedHeaders,
      redirect: "manual",
    };

    if (supportsBody) {
      requestConfig.body = incomingRequest.body;
    }

    const backendResponse = await fetch(destinationUrl, requestConfig);

    const responseHeaders = new Headers();
    for (const [headerKey, headerValue] of backendResponse.headers) {
      if (headerKey.toLowerCase() === "transfer-encoding") continue;
      responseHeaders.set(headerKey, headerValue);
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (processingError) {
    return new Response("Bad Gateway: Relay Failed", { status: 502 });
  }
}
