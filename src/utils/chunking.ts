/**
 * Text Chunking Utility
 *
 * Splits large texts into chunks suitable for embedding generation.
 * Handles token limits, word boundaries, and overlap for context preservation.
 */

/**
 * Estimate token count for text.
 *
 * Uses a simple heuristic: ~4 characters per token for English text.
 * This is approximate but works well for our use case.
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Remove whitespace for more accurate estimate
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;

  // Rough estimate: 1 token per 4 characters for English text
  // This is a simplification but works well for most cases
  return Math.ceil(trimmed.length / 4);
}

/**
 * Split text into chunks that fit within max tokens.
 *
 * Tries to break at word boundaries when possible.
 * Adds overlap between chunks to preserve context.
 *
 * @param text - Text to chunk
 * @param maxTokens - Maximum tokens per chunk (default: 8000 for OpenRouter)
 * @param overlapTokens - Number of tokens to overlap between chunks (default: 0)
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  maxTokens: number = 8000,
  overlapTokens: number = 0
): string[] {
  // Handle empty or very short text
  if (!text || text.trim().length === 0) {
    return [''];
  }

  const trimmedText = text.trim();
  const estimatedTokens = estimateTokens(trimmedText);

  // If text is under the limit, return as-is
  if (estimatedTokens <= maxTokens) {
    return [trimmedText];
  }

  const chunks: string[] = [];
  const maxChars = maxTokens * 4; // Convert tokens to approximate characters
  const overlapChars = overlapTokens * 4;

  let startIndex = 0;
  let previousEndIndex = 0;
  let loopCount = 0;
  const maxLoops = 1000; // Safety limit to prevent infinite loops

  while (startIndex < trimmedText.length && loopCount < maxLoops) {
    loopCount++;

    // Calculate end index for this chunk
    let endIndex = Math.min(startIndex + maxChars, trimmedText.length);

    // If not the last chunk, try to break at a word boundary
    if (endIndex < trimmedText.length) {
      // Look for word boundary near the end
      const boundaryChars = 200; // Look back up to 200 chars
      const searchStart = Math.max(startIndex, endIndex - boundaryChars);
      const substring = trimmedText.slice(searchStart, endIndex);

      // Try to find line break first, then space, then punctuation
      let breakIndex = -1;

      // Look for last newline in the window
      const lastNewline = substring.lastIndexOf('\n');
      if (lastNewline !== -1) {
        breakIndex = searchStart + lastNewline + 1;
      } else {
        // Look for last space in the window
        const lastSpace = substring.lastIndexOf(' ');
        if (lastSpace !== -1) {
          breakIndex = searchStart + lastSpace + 1;
        } else {
          // Look for sentence-ending punctuation
          for (let i = substring.length - 1; i >= Math.max(0, substring.length - 100); i--) {
            const char = substring[i];
            if (char === '.' || char === '!' || char === '?') {
              // Make sure it's actually a sentence end (followed by space or end)
              const nextChar = substring[i + 1];
              if (!nextChar || nextChar === ' ' || nextChar === '\n') {
                breakIndex = searchStart + i + 1;
                break;
              }
            }
          }
        }
      }

      // Use the break index if found, otherwise use the calculated end
      if (breakIndex > startIndex) {
        endIndex = breakIndex;
      }
    }

    // Extract the chunk
    const chunk = trimmedText.slice(startIndex, endIndex);
    chunks.push(chunk);

    // Move to next chunk, accounting for overlap
    if (overlapChars > 0 && endIndex < trimmedText.length) {
      // Only apply overlap if not at the end
      startIndex = Math.max(endIndex - overlapChars, endIndex - maxChars / 2);

      // Ensure we make progress
      if (startIndex <= previousEndIndex) {
        startIndex = endIndex;
      }

      // Also ensure we move forward at least a bit
      if (startIndex >= endIndex) {
        startIndex = endIndex;
      }
    } else {
      startIndex = endIndex;
    }

    previousEndIndex = endIndex;
  }

  return chunks;
}

/**
 * Chunk text specifically for embedding generation.
 *
 * Uses 8000 token limit (OpenRouter's limit for text-embedding-3-small).
 *
 * @param text - Text to chunk
 * @returns Array of text chunks suitable for embeddings
 */
export function chunkForEmbedding(text: string): string[] {
  return chunkText(text, 8000, 100); // 100 token overlap for context
}
