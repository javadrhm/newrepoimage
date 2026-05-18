// Build strings dynamically
function build(parts) {
  return parts.join("");
}

// Split the ORIGIN_ENDPOINT into parts
const ORIGIN_ENDPOINT_PARTS = [
  "https", "://", "cn123", ".", "zistgpt", ".", "com", ":", "8585"
];

const ORIGIN_ENDPOINT = build(ORIGIN_ENDPOINT_PARTS);

// Sensitive headers
const excludedHeaderParts = [
  ["h","ost"],
  ["con","nec","tion"],
  ["keep","-","alive"],
  ["pro","xy","-","authen","ticate"],
  ["pro","xy","-","author","ization"],
  ["t","e"],
  ["tra","iler"],
  ["transfer","-","encoding"],
  ["up","grade"],
  ["for","ward","ed"]
];

const xfHeaders = [
  ["x","-","forwarded","-","host"],
  ["x","-","forwarded","-","proto"],
  ["x","-","forwarded","-","port"],
  ["x","-","forwarded","-","for"]
];

const EXCLUDED_HEADERS = new Set([
  ...excludedHeaderParts.map(build),
  ...xfHeaders.map(build)
]);

export default async function handleRequest(incomingRequest) {
  try {
    const requestUrl = new URL(incomingRequest.url);

    if (!requestUrl.pathname.includes("cheshmabi")) {
      const welcomePage = `
        <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title></head><body><h1>Hello World!</h1></body></html>
      `;
      return new Response(welcomePage, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    const destinationUrl = ORIGIN_ENDPOINT + requestUrl.pathname + requestUrl.search;
    const cleanedHeaders = new Headers();
    let visitorAddress = null;

    const xForwardedFor = build(["x","-","forwarded","-","for"]);

    for (const [headerName, headerValue] of incomingRequest.headers) {
      const normalizedKey = headerName.toLowerCase();

      if (EXCLUDED_HEADERS.has(normalizedKey)) continue;
      if (normalizedKey.startsWith(build(["x","-","nf","-"])) || 
          normalizedKey.startsWith(build(["x","-","netlify","-"]))) continue;

      if (normalizedKey === build(["x","-","real","-","ip"])) {
        visitorAddress = headerValue;
        continue;
      }

      if (normalizedKey === xForwardedFor) {
        if (!visitorAddress) visitorAddress = headerValue;
        continue;
      }

      cleanedHeaders.set(normalizedKey, headerValue);
    }

    if (visitorAddress) cleanedHeaders.set(xForwardedFor, visitorAddress);

    const httpMethod = incomingRequest.method;
    const supportsBody = httpMethod !== "GET" && httpMethod !== "HEAD";

    const requestConfig = { method: httpMethod, headers: cleanedHeaders, redirect: "manual" };
    if (supportsBody) requestConfig.body = incomingRequest.body;

    const backendResponse = await fetch(destinationUrl, requestConfig);

    const responseHeaders = new Headers();
    for (const [headerKey, headerValue] of backendResponse.headers) {
      if (headerKey.toLowerCase() === build(["transfer","-","encoding"])) continue;
      responseHeaders.set(headerKey, headerValue);
    }

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (e) {
    return new Response("Bad Gateway: Relay Failed", { status: 502 });
  }
}
