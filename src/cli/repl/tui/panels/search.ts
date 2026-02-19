/**
 * Advanced Search Panel
 *
 * Enhanced search with filtering, sorting, and detailed results
 */

import { K0NTEXT_THEME } from '../theme.js';
import type { ContextItem } from '../../../../db/client.js';
import type { ContextType } from '../../../../db/schema.js';

/**
 * Search filter options
 */
export interface SearchFilters {
  type?: ContextType;
  sortBy?: 'relevance' | 'name' | 'date' | 'size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

/**
 * Enhanced search result with metadata
 */
export interface EnhancedSearchResult {
  item: ContextItem;
  score?: number;
  highlights: string[];
}

/**
 * Advanced Search Panel
 */
export class AdvancedSearchPanel {
  /**
   * Display advanced search results with formatting
   */
  displayResults(results: EnhancedSearchResult[], query: string, filters: SearchFilters): string {
    const lines: string[] = [];

    // Header with query and filters
    lines.push('');
    lines.push(K0NTEXT_THEME.header(`━━━ Search Results: "${query}" ━━━`));

    if (filters.type) {
      lines.push(`  ${K0NTEXT_THEME.dim('Filter:')} ${K0NTEXT_THEME.cyan(filters.type)}`);
    }
    if (filters.sortBy) {
      lines.push(`  ${K0NTEXT_THEME.dim('Sorted by:')} ${K0NTEXT_THEME.cyan(filters.sortBy)} ${K0NTEXT_THEME.dim('(')}${filters.sortOrder}${K0NTEXT_THEME.dim(')')}`);
    }
    lines.push(`  ${K0NTEXT_THEME.dim('Found:')} ${K0NTEXT_THEME.highlight(results.length.toString())} results`);
    lines.push('');

    // Type legend
    lines.push(K0NTEXT_THEME.dim('Types:  📄=doc 💻=code ⚙️=config 📋=workflow 🤖=agent 🔧=command'));
    lines.push('');

    // Display results
    for (let i = 0; i < Math.min(results.length, filters.limit || 20); i++) {
      const { item, score, highlights } = results[i];

      // Type emoji
      const typeEmoji = this.getTypeEmoji(item.type);
      const relevance = score !== undefined ? ` ${K0NTEXT_THEME.dim(`(${Math.round(score * 100)}%)`)}` : '';

      lines.push(`${K0NTEXT_THEME.primary(`${i + 1}.`)} ${typeEmoji} ${K0NTEXT_THEME.highlight(item.name)}${relevance}`);

      if (item.filePath) {
        lines.push(`     ${K0NTEXT_THEME.dim(item.filePath)}`);
      }

      // Show content preview
      if (item.content) {
        const preview = this.getContentPreview(item.content, query);
        if (preview) {
          lines.push(`     ${K0NTEXT_THEME.dim(preview)}`);
        }
      }

      // Show metadata
      if (item.metadata) {
        const meta = this.formatMetadata(item.metadata as Record<string, unknown>);
        if (meta) {
          lines.push(`     ${K0NTEXT_THEME.dim(meta)}`);
        }
      }

      lines.push('');
    }

    if (results.length > (filters.limit || 20)) {
      const remaining = results.length - (filters.limit || 20);
      lines.push(K0NTEXT_THEME.dim(`     ... and ${remaining} more results`));
      lines.push('');
    }

    // Search tips
    lines.push(K0NTEXT_THEME.header('━━━ Search Tips ━━━'));
    lines.push(`  ${K0NTEXT_THEME.cyan('•')} Use ${K0NTEXT_THEME.highlight('search <query> --type <type>')} to filter`);
    lines.push(`  ${K0NTEXT_THEME.cyan('•')} Use ${K0NTEXT_THEME.highlight('search <query> --sort <field>')} to sort`);
    lines.push(`  ${K0NTEXT_THEME.cyan('•')} Use ${K0NTEXT_THEME.highlight('search <query> --limit <n>')} for more results`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get emoji for context type
   */
  private getTypeEmoji(type: ContextType): string {
    const emojis: Record<string, string> = {
      doc: '📄',
      code: '💻',
      tool_config: '⚙️',
      workflow: '📋',
      agent: '🤖',
      command: '🔧',
      commit: '📝',
      knowledge: '🧠',
      config: '⚙️'
    };
    return emojis[type] || '📄';
  }

  /**
   * Get content preview with highlighted query terms
   */
  private getContentPreview(content: string, query: string): string {
    const maxLength = 100;
    const preview = content.slice(0, maxLength);

    // Highlight query terms
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    let highlighted = preview;

    for (const term of terms) {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
      highlighted = highlighted.replace(regex, K0NTEXT_THEME.highlight('$1'));
    }

    return highlighted + (content.length > maxLength ? '...' : '');
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Format metadata for display
   */
  private formatMetadata(metadata: Record<string, unknown>): string | null {
    const parts: string[] = [];

    if (metadata.size !== undefined) {
      parts.push(K0NTEXT_THEME.formatFileSize(Number(metadata.size)));
    }

    if (metadata.module) {
      parts.push(`module:${metadata.module}`);
    }

    if (metadata.tool) {
      parts.push(`tool:${metadata.tool}`);
    }

    return parts.length > 0 ? parts.join(' • ') : null;
  }

  /**
   * Sort results by various criteria
   */
  sortResults(results: EnhancedSearchResult[], sortBy: 'relevance' | 'name' | 'date' | 'size', order: 'asc' | 'desc'): EnhancedSearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = (b.score || 0) - (a.score || 0);
          break;
        case 'name':
          comparison = a.item.name.localeCompare(b.item.name);
          break;
        case 'date': {
          const aDate = a.item.updatedAt ? new Date(a.item.updatedAt).getTime() : 0;
          const bDate = b.item.updatedAt ? new Date(b.item.updatedAt).getTime() : 0;
          comparison = bDate - aDate;
          break;
        }
        case 'size': {
          const aSize = (a.item.metadata as Record<string, unknown>)?.size || 0;
          const bSize = (b.item.metadata as Record<string, unknown>)?.size || 0;
          comparison = Number(bSize) - Number(aSize);
          break;
        }
      }

      return order === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Filter results by type
   */
  filterByType(results: EnhancedSearchResult[], type: ContextType): EnhancedSearchResult[] {
    return results.filter(r => r.item.type === type);
  }

  /**
   * Parse search flags from command arguments
   */
  parseSearchFlags(args: string[]): SearchFilters {
    const filters: SearchFilters = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      switch (arg) {
        case '--type':
        case '-t':
          filters.type = (args[++i] || 'all') as ContextType;
          break;
        case '--sort':
        case '-s':
          filters.sortBy = (args[++i] || 'relevance') as SearchFilters['sortBy'];
          break;
        case '--order':
        case '-o':
          filters.sortOrder = (args[++i] || 'desc') as SearchFilters['sortOrder'];
          break;
        case '--limit':
        case '-l':
          filters.limit = Number(args[++i]) || 20;
          break;
      }
    }

    return filters;
  }

  /**
   * Show search help
   */
  showSearchHelp(): string {
    const lines = [
      '',
      K0NTEXT_THEME.header('━━━ Advanced Search Help ━━━'),
      '',
      '  Usage:',
      '    search <query> [options]',
      '',
      '  Options:',
      '    --type, -t <type>    Filter by type (doc, code, tool_config, workflow, agent, command)',
      '    --sort, -s <field>  Sort by (relevance, name, date, size)',
      '    --order, -o <dir>   Sort order (asc, desc)',
      '    --limit, -l <n>     Max results (default: 20)',
      '',
      '  Examples:',
      '    search auth --type code',
      '    search "user login" --sort date --order desc',
      '    search config --limit 50',
      '',
      '  Shortcuts:',
      '    s <query>           Alias for search',
      '    f <query>           Search and filter',
      '    ?                  Show this help',
      ''
    ];

    return lines.join('\n');
  }
}
