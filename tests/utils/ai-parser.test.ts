import { describe, it, expect } from 'vitest';
import { parseAIResponse } from '../../src/utils/ai-parser.js';

describe('parseAIResponse', () => {
  it('should parse valid JSON directly', () => {
    const input = '{"key": "value"}';
    const result = parseAIResponse<{key: string}>(input);
    expect(result).toEqual({key: "value"});
  });

  it('should parse JSON wrapped in markdown blocks', () => {
    const input = 'Here is the JSON:\n```json\n{"key": "value"}\n```\nHope this helps!';
    const result = parseAIResponse<{key: string}>(input);
    expect(result).toEqual({key: "value"});
  });

  it('should parse JSON object from conversational text', () => {
    const input = 'The result is { "success": true, "count": 42 } which is good.';
    const result = parseAIResponse<{success: boolean, count: number}>(input);
    expect(result).toEqual({success: true, count: 42});
  });

  it('should parse JSON array from conversational text', () => {
    const input = 'Check these files: ["file1.ts", "file2.ts"] for updates.';
    const result = parseAIResponse<string[]>(input);
    expect(result).toEqual(["file1.ts", "file2.ts"]);
  });

  it('should handle nested objects', () => {
    const input = 'Result: {"a": {"b": 1}}';
    const result = parseAIResponse<any>(input);
    expect(result).toEqual({a: {b: 1}});
  });

  it('should return null for invalid JSON', () => {
    const input = 'This is not JSON { at all';
    const result = parseAIResponse<any>(input);
    expect(result).toBeNull();
  });

  it('should return null for empty input', () => {
    const result = parseAIResponse<any>('');
    expect(result).toBeNull();
  });

  it('should prefer object if it appears first', () => {
    const input = 'Object {"id": 1} and Array [1, 2]';
    const result = parseAIResponse<any>(input);
    expect(result).toEqual({id: 1});
  });

  it('should prefer array if it appears first', () => {
    const input = 'Array [1, 2] and Object {"id": 1}';
    const result = parseAIResponse<any>(input);
    expect(result).toEqual([1, 2]);
  });
});
