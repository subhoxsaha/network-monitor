/**
 * Centralized API utility for Network Monitor Pro.
 * Handles retries with exponential backoff, timeouts, and standardized error parsing.
 */

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 second

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced fetch with retry logic and timeout
 */
export const resilientFetch = async (url, options = {}, retries = MAX_RETRIES) => {
  const { timeout = 10000, ...fetchOptions } = options;
  
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });
      
      clearTimeout(id);
      
      // If success, return response (wrap in a helper if needed)
      if (response.ok) {
        return response;
      }
      
      // Handle non-transient status codes
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        throw new Error(`API Request failed with status ${response.status}`);
      }

      // Special case: If 500 but message suggests a race condition, retry it
      const responseData = await response.clone().json().catch(() => ({}));
      const isRaceCondition = responseData.error?.includes('duplicate key') || 
                              responseData.error?.includes('VersionError') ||
                              responseData.message?.includes('duplicate key');

      if (isRaceCondition && i < retries - 1) {
        console.warn(`[API] Transient conflict detected (500). Retrying...`);
        const backoff = INITIAL_BACKOFF * Math.pow(2, i);
        await sleep(backoff);
        continue;
      }
      
      throw new Error(responseData.error || `Server returned ${response.status}`);
      
    } catch (err) {
      clearTimeout(id);
      lastError = err;
      
      // Only retry on network errors or transient server errors
      const isNetworkError = err.name === 'TypeError' || err.name === 'AbortError';
      const isTransientError = !isNetworkError && i < retries - 1;
      
      if (isNetworkError || isTransientError) {
        const backoff = INITIAL_BACKOFF * Math.pow(2, i);
        console.warn(`[API] Attempt ${i + 1} failed: ${err.message}. Retrying in ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      
      throw err;
    }
  }
  
  throw lastError;
};

/**
 * Standardized API call helper
 */
export const apiCall = async (method, userId, pathOrBody = '/api/trails', body = null) => {
  let path = pathOrBody;
  let finalBody = body;

  // Handle 3-argument call where the 3rd arg is the body
  if (typeof pathOrBody === 'object' && pathOrBody !== null) {
    path = '/api/trails';
    finalBody = pathOrBody;
  }

  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    };
    
    if (finalBody) {
      opts.body = JSON.stringify(finalBody);
    }
    
    const response = await resilientFetch(path, opts);
    
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { success: true, raw: true };
    }
    
    return await response.json();
  } catch (err) {
    console.error(`[API Error] ${method} ${path}:`, err.message);
    return { 
      error: true, 
      message: err.message,
      isNetworkError: err.name === 'TypeError' || err.name === 'AbortError'
    };
  }
};
