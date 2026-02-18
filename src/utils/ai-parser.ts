/**
 * AI Response Parser Utility
 *
 * Provides robust JSON parsing for AI-generated responses, which often
 * include markdown formatting or conversational filler around the JSON.
 */

/**
 * Parses a JSON response from an AI model.
 *
 * Attempts to:
 * 1. Parse the entire string as JSON
 * 2. Find and parse the first JSON object {} or array [] in the string
 *
 * @param response The raw string response from the AI
 * @returns The parsed JSON object of type T, or null if parsing fails
 */
export function parseAIResponse<T>(response: string): T | null {
  if (!response || typeof response !== 'string') {
    return null;
  }

  // 1. Try direct parse first
  try {
    return JSON.parse(response.trim()) as T;
  } catch {
    // Fall through to extraction
  }

  // 2. Try to extract JSON from response
  // Look for both {} and [] structures
  const objStart = response.indexOf('{');
  const objEnd = response.lastIndexOf('}');
  const arrStart = response.indexOf('[');
  const arrEnd = response.lastIndexOf(']');

  // Determine which structure to try first based on appearance in the string
  const hasObj = objStart !== -1 && objEnd !== -1 && objEnd > objStart;
  const hasArr = arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart;

  if (hasObj && (!hasArr || objStart < arrStart)) {
    // Try object first
    const result = tryParse(response, objStart, objEnd);
    if (result !== null) return result as T;

    // If object failed but array is available, try array
    if (hasArr) {
      return tryParse(response, arrStart, arrEnd) as T;
    }
  } else if (hasArr) {
    // Try array first
    const result = tryParse(response, arrStart, arrEnd);
    if (result !== null) return result as T;

    // If array failed but object is available, try object
    if (hasObj) {
      return tryParse(response, objStart, objEnd) as T;
    }
  }

  return null;
}

/**
 * Internal helper to try parsing a substring
 */
function tryParse(text: string, start: number, end: number): any | null {
  try {
    const jsonSubstring = text.slice(start, end + 1);
    return JSON.parse(jsonSubstring);
  } catch {
    return null;
  }
}
