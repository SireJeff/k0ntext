/**
 * K0ntext Theme System
 *
 * Orange gradient with purple/pink/cyan accents for modern CLI experience
 */

import chalk from 'chalk';

/**
 * Terminal capabilities
 */
interface TerminalCapabilities {
  isTTY: boolean;
  supportsColor: boolean;
  supports256: boolean;
  supportsUnicode: boolean;
}

/**
 * Chalk type aliases
 */
type ChalkColor = typeof chalk;

/**
 * K0ntext color theme
 */
export const K0NTEXT_THEME = {
  // Orange gradient for primary elements
  primary: chalk.hex('#F97316'),     // Orange-500
  primaryLight: chalk.hex('#FB923C'), // Orange-400
  primaryDark: chalk.hex('#EA580C'),  // Orange-600

  // Purple accents for headers
  header: chalk.hex('#8B5CF6'),       // Purple-500
  headerLight: chalk.hex('#A78BFA'),  // Purple-400

  // Pink for highlights
  highlight: chalk.hex('#EC4899'),    // Pink-500
  highlightLight: chalk.hex('#F472B6'), // Pink-400

  // Cyan for status
  status: chalk.hex('#06B6D4'),       // Cyan-500
  statusLight: chalk.hex('#22D3EE'),  // Cyan-400
  cyan: chalk.hex('#06B6D4'),         // Alias for cyan

  // Semantic colors
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,

  // Neutrals
  muted: chalk.gray,
  dim: chalk.dim,

  // Background colors
  bgPrimary: chalk.bgHex('#F97316'),
  bgHeader: chalk.bgHex('#8B5CF6'),
  bgHighlight: chalk.bgHex('#EC4899'),
  bgStatus: chalk.bgHex('#06B6D4'),

  /**
   * Detect terminal capabilities
   */
  detectCapabilities(): TerminalCapabilities {
    const isTTY = process.stdout.isTTY;
    const supportsColor = chalk.level > 0 && !process.env.NO_COLOR;
    const supports256 = chalk.level >= 2;
    const supportsUnicode = process.platform !== 'win32' ||
      (process.env.TERM?.includes('xterm') || process.env.WT_SESSION);

    return { isTTY: !!isTTY, supportsColor: !!supportsColor, supports256: !!supports256, supportsUnicode: !!supportsUnicode };
  },

  /**
   * Get gradient string for logo/banner
   */
  gradientText(text: string): string {
    const { supports256 } = this.detectCapabilities();

    if (!supports256 || process.env.NO_COLOR) {
      return this.primary(text);
    }

    // Create gradient effect using ANSI colors
    const colors = ['#F97316', '#FBBF24', '#F472B6', '#8B5CF6', '#06B6D4'];
    let result = '';
    const chunkSize = Math.ceil(text.length / colors.length);

    for (let i = 0; i < text.length; i++) {
      const colorIndex = Math.floor(i / chunkSize) % colors.length;
      const color = colors[colorIndex];
      result += chalk.hex(color)(text[i]);
    }

    return result;
  },

  /**
   * Get border characters based on terminal capabilities
   */
  getBorders() {
    const { supportsUnicode } = this.detectCapabilities();

    if (supportsUnicode) {
      return {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║',
        leftT: '╠',
        rightT: '╣',
        topT: '╦',
        bottomT: '╩',
        cross: '╬'
      };
    }

    // ASCII fallback
    return {
      topLeft: '+',
      topRight: '+',
      bottomLeft: '+',
      bottomRight: '+',
      horizontal: '-',
      vertical: '|',
      leftT: '+',
      rightT: '+',
      topT: '+',
      bottomT: '+',
      cross: '+'
    };
  },

  /**
   * Create a styled box with text
   */
  box(title: string, content: string, borderColor = 'primary'): string {
    const borders = this.getBorders();

    // Get color function based on borderColor
    let colorFn: ChalkColor;
    switch (borderColor) {
      case 'primary':
        colorFn = this.primary;
        break;
      case 'header':
        colorFn = this.header;
        break;
      case 'highlight':
        colorFn = this.highlight;
        break;
      case 'status':
        colorFn = this.status;
        break;
      case 'success':
        colorFn = this.success;
        break;
      default:
        colorFn = this.primary;
    }

    const lines = content.split('\n');
    const maxLength = Math.max(title.length, ...lines.map(l => l.length));

    let result = '';
    result += colorFn(borders.topLeft + borders.horizontal.repeat(maxLength + 2) + borders.topRight) + '\n';
    result += colorFn(borders.vertical) + ' ' + this.primary(title.padEnd(maxLength)) + ' ' + colorFn(borders.vertical) + '\n';
    result += colorFn(borders.leftT + borders.horizontal.repeat(maxLength + 2) + borders.rightT) + '\n';

    for (const line of lines) {
      result += colorFn(borders.vertical) + ' ' + line.padEnd(maxLength) + ' ' + colorFn(borders.vertical) + '\n';
    }

    result += colorFn(borders.bottomLeft + borders.horizontal.repeat(maxLength + 2) + borders.bottomRight);

    return result;
  },

  /**
   * Create progress bar
   */
  progressBar(current: number, total: number, width = 20): string {
    const percentage = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.floor((percentage / 100) * width);
    const empty = width - filled;

    const filledBar = this.primary('█'.repeat(filled));
    const emptyBar = this.dim('░'.repeat(empty));
    const percentageText = ` ${Math.round(percentage)}%`;

    return `${filledBar}${emptyBar}${percentageText}`;
  },

  /**
   * Format file size with color
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const rounded = Math.round(size * 10) / 10;
    const colorFn = unitIndex < 2 ? this.success : this.warning;

    return colorFn(`${rounded}${units[unitIndex]}`);
  },

  /**
   * Format timestamp with color
   */
  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return this.success(`${seconds}s ago`);
    if (minutes < 60) return this.status(`${minutes}m ago`);
    if (hours < 24) return this.header(`${hours}h ago`);
    return this.headerLight(`${days}d ago`);
  }
} as const;

/**
 * Terminal utility functions
 */
export const terminal = {
  /**
   * Clear screen
   */
  clear(): void {
    console.clear();
  },

  /**
   * Move cursor to position
   */
  moveTo(x: number, y: number): void {
    process.stdout.write(`\x1b[${y};${x}H`);
  },

  /**
   * Hide cursor
   */
  hideCursor(): void {
    process.stdout.write('\x1b[?25l');
  },

  /**
   * Show cursor
   */
  showCursor(): void {
    process.stdout.write('\x1b[?25h');
  },

  /**
   * Get terminal dimensions
   */
  getSize(): { width: number; height: number } {
    return {
      width: process.stdout.columns || 80,
      height: process.stdout.rows || 24
    };
  }
};
