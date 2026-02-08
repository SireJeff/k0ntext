/**
 * Update Checker
 *
 * Checks for new versions of k0ntext and notifies users
 */

import https from 'https';
import chalk from 'chalk';
import { K0NTEXT_THEME } from '../tui/theme.js';

/**
 * Version comparison result
 */
export interface VersionCheckResult {
  current: string;
  latest: string;
  hasUpdate: boolean;
  type: 'major' | 'minor' | 'patch' | 'none';
}

/**
 * Update notification options
 */
export interface UpdateNotificationOptions {
  showIfCurrent: boolean;
  checkInterval: number; // milliseconds
}

/**
 * Update Checker
 */
export class UpdateChecker {
  private currentVersion: string;
  private lastCheck: number = 0;
  private cachedResult: VersionCheckResult | null = null;
  private checkInterval: number;

  constructor(currentVersion: string, checkInterval = 24 * 60 * 60 * 1000) {
    this.currentVersion = currentVersion;
    this.checkInterval = checkInterval;
  }

  /**
   * Check for updates (with caching)
   */
  async check(force = false): Promise<VersionCheckResult> {
    const now = Date.now();

    // Return cached result if still valid
    if (!force && this.cachedResult && (now - this.lastCheck) < this.checkInterval) {
      return this.cachedResult;
    }

    try {
      const latest = await this.fetchLatestVersion();
      const hasUpdate = this.needsUpdate(this.currentVersion, latest);
      const type = this.getUpdateType(this.currentVersion, latest);

      const result: VersionCheckResult = {
        current: this.currentVersion,
        latest,
        hasUpdate,
        type
      };

      this.cachedResult = result;
      this.lastCheck = now;

      return result;
    } catch (error) {
      // Return current version if check fails
      return {
        current: this.currentVersion,
        latest: this.currentVersion,
        hasUpdate: false,
        type: 'none'
      };
    }
  }

  /**
   * Fetch latest version from npm registry
   */
  private async fetchLatestVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'registry.npmjs.org',
        path: '/k0ntext',
        timeout: 5000
      };

      const req = https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const pkg = JSON.parse(data);
            const latest = pkg['dist-tags'].latest;
            resolve(latest);
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', reject);
    });
  }

  /**
   * Check if current version needs update
   */
  private needsUpdate(current: string, latest: string): boolean {
    return current !== latest;
  }

  /**
   * Get update type
   */
  private getUpdateType(current: string, latest: string): 'major' | 'minor' | 'patch' | 'none' {
    if (current === latest) return 'none';

    const [cMajor, cMinor, cPatch] = current.split('.').map(Number);
    const [lMajor, lMinor, lPatch] = latest.split('.').map(Number);

    if (lMajor > cMajor) return 'major';
    if (lMinor > cMinor) return 'minor';
    if (lPatch > cPatch) return 'patch';

    return 'none';
  }

  /**
   * Get type emoji
   */
  private getTypeEmoji(type: 'major' | 'minor' | 'patch' | 'none'): string {
    const emojis = {
      major: '🚨',
      minor: '✨',
      patch: '🔧',
      none: '✓'
    };
    return emojis[type];
  }

  /**
   * Format update notification
   */
  formatNotification(result: VersionCheckResult): string {
    if (!result.hasUpdate) {
      return K0NTEXT_THEME.success('✓ You are on the latest version');
    }

    const typeEmoji = this.getTypeEmoji(result.type);

    const updateMessage = [
      '',
      `${typeEmoji} ${K0NTEXT_THEME.highlight('Update Available')}`,
      '',
      `  ${K0NTEXT_THEME.primary('Current:')}  ${result.current}`,
      `  ${K0NTEXT_THEME.success('Latest:')}   ${result.latest}`,
      '',
      `  Run ${K0NTEXT_THEME.highlight('npm update -g k0ntext')} to update`,
      ''
    ];

    return updateMessage.join('\n');
  }

  /**
   * Show notification if update available
   */
  async showNotification(options: UpdateNotificationOptions = { showIfCurrent: false, checkInterval: 24 * 60 * 60 * 1000 }): Promise<void> {
    const { showIfCurrent = false } = options;

    const result = await this.check();

    if (result.hasUpdate) {
      console.log(this.formatNotification(result));
    } else if (showIfCurrent) {
      console.log(K0NTEXT_THEME.success('\n✓ K0ntext is up to date'));
    }
  }

  /**
   * Check and prompt for update
   */
  async checkAndPrompt(): Promise<boolean> {
    const result = await this.check();

    if (!result.hasUpdate) {
      return false;
    }

    console.log('');
    console.log(this.formatNotification(result));

    return true;
  }
}
