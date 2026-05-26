// API fetch helper for Django backend session-based communication

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  // Ensure we include session cookies
  options.credentials = "include";
  
  // Set headers
  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Attach Django CSRF Token if it's a modifying request
  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }

  options.headers = headers;

  // Next.js will rewrite '/api/...' to 'http://127.0.0.1:8000/api/...'
  const response = await fetch(endpoint, options);
  
  if (!response.ok) {
    let errorMsg = "Une erreur est survenue.";
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.detail || errorMsg;
    } catch {
      // Non-JSON response or empty
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
