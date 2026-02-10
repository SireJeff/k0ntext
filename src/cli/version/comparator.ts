/**
 * Version Comparator
 *
 * Semantic version comparison for detecting outdated files.
 * Reuses logic from UpdateChecker for consistency.
 */

import type { UpdateType } from './types.js';

/**
 * Parse semantic version string into components
 *
 * @param version - Version string (e.g., "3.3.1")
 * @returns Object with major, minor, patch components
 */
function parseSemver(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(Number);

  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0
  };
}

/**
 * Compare two version strings
 *
 * @param a - First version string
 * @param b - Second version string
 * @returns Negative if a < b, positive if a > b, zero if equal
 */
export function compareVersions(a: string, b: string): number {
  const [cMajor, cMinor, cPatch] = a.split('.').map(Number);
  const [lMajor, lMinor, lPatch] = b.split('.').map(Number);

  if (lMajor !== cMajor) return lMajor - cMajor;
  if (lMinor !== cMinor) return lMinor - cMinor;
  return lPatch - cPatch;
}

/**
 * Check if a file version needs updating
 *
 * @param fileVersion - Version from the file
 * @param currentVersion - Current k0ntext version
 * @returns True if file is outdated
 */
export function needsUpdate(fileVersion: string, currentVersion: string): boolean {
  if (fileVersion === currentVersion) return false;
  return compareVersions(fileVersion, currentVersion) > 0;
}

/**
 * Get the type of update needed
 *
 * @param fileVersion - Version from the file
 * @param currentVersion - Current k0ntext version
 * @returns Type of update: 'major', 'minor', 'patch', or 'none'
 */
export function getUpdateType(fileVersion: string, currentVersion: string): UpdateType {
  if (fileVersion === currentVersion) return 'none';

  const [cMajor, cMinor, cPatch] = fileVersion.split('.').map(Number);
  const [lMajor, lMinor, lPatch] = currentVersion.split('.').map(Number);

  if (lMajor > cMajor) return 'major';
  if (lMinor > cMinor) return 'minor';
  if (lPatch > cPatch) return 'patch';

  return 'none';
}

/**
 * Format update type as a human-readable string
 *
 * @param type - Update type
 * @returns Formatted string (e.g., "Major (3.0.0 → 3.1.0)")
 */
export function formatUpdateType(type: UpdateType, from: string, to: string): string {
  const emoji = {
    major: '🚨',
    minor: '✨',
    patch: '🔧',
    none: '✓'
  }[type] || '→';

  const label = {
    major: 'Major',
    minor: 'Minor',
    patch: 'Patch',
    none: 'Current'
  }[type];

  return `${emoji} ${label} (${from} → ${to})`;
}

/**
 * Validate a version string format
 *
 * @param version - Version string to validate
 * @returns True if valid semver format
 */
export function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+/.test(version);
}
