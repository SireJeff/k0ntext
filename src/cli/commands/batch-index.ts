/**
 * Batch Index Command
 *
 * Indexes large monorepos by processing modules in batches.
 * Handles the 100-file limit by splitting content across multiple batches.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import fs from 'fs';
import path from 'path';

import { createIntelligentAnalyzer, type DiscoveredFile } from '../../analyzer/intelligent-analyzer.js';
import { hasOpenRouterKey } from '../../embeddings/openrouter.js';
import { DatabaseClient } from '../../db/client.js';

/**
 * Monorepo module configuration
 */
interface MonorepoModule {
  name: string;
  path: string;
  priority: number;
  description: string;
}

/**
 * Batch index command options
 */
export interface BatchIndexOptions {
  batchSize?: number;
  maxFiles?: number;
  skipEmbeddings?: boolean;
  verbose?: boolean;
}

/**
 * Detect monorepo structure from current directory
 */
function detectMonorepoStructure(projectRoot: string): MonorepoModule[] {
  const detectedModules: MonorepoModule[] = [];

  // Always include root
  detectedModules.push({
    name: 'root',
    path: '.',
    priority: 1,
    description: 'Root configuration and documentation'
  });

  // Detect common monorepo directories
  const commonDirs = ['backend', 'frontend', 'core', 'packages', 'services', 'apps', 'docs', 'devops', 'shared', 'lib'];

  for (const dir of commonDirs) {
    const fullPath = path.join(projectRoot, dir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      // Check if directory has actual code files (not empty)
      const hasContent = fs.readdirSync(fullPath).some(
        item => !item.startsWith('.') && item !== 'node_modules'
      );

      if (hasContent) {
        detectedModules.push({
          name: dir,
          path: dir,
          priority: detectedModules.length + 1,
          description: `${dir} module`
        });
      }
    }
  }

  // Detect subdirectories within main modules
  for (const module of [...detectedModules]) {
    if (module.path === '.' || module.path === 'root') continue;

    const modulePath = path.join(projectRoot, module.path);
    if (!fs.existsSync(modulePath)) continue;

    try {
      const entries = fs.readdirSync(modulePath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subPath = path.join(module.path, entry.name);

          // Check if this submodule has code files
          const subModulePath = path.join(projectRoot, subPath);
          const hasCode = fs.readdirSync(subModulePath).some(
            item => {
              const ext = path.extname(item);
              return ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java'].includes(ext);
            }
          );

          if (hasCode) {
            detectedModules.push({
              name: `${module.name}/${entry.name}`,
              path: subPath,
              priority: detectedModules.length + 1,
              description: `${entry.name} submodule`
            });
          }
        }
      }
    } catch {
      // Skip if we can't read directory
    }
  }

  return detectedModules.sort((a, b) => a.priority - b.priority);
}

/**
 * Split files into batches
 */
function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Generate embeddings for indexed items
 */
async function generateEmbeddingsBatch(
  db: DatabaseClient,
  filePaths: string[],
  analyzer: ReturnType<typeof createIntelligentAnalyzer>,
  spinner: Ora
): Promise<number> {
  let embeddingsCount = 0;

  try {
    const embeddings = new Map<string, number[]>();

    spinner.text = `Generating embeddings for ${filePaths.length} files...`;

    // Process in smaller chunks to avoid overwhelming the API
    const embeddingBatchSize = 50;
    const batches = splitIntoBatches(filePaths, embeddingBatchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      spinner.text = `Generating embeddings: batch ${i + 1}/${batches.length} (${batch.length} files)...`;

      for (const filePath of batch) {
        try {
          const item = db.getAllItems().find((item) => item.filePath === filePath);
          if (item && item.content) {
            const embedding = await analyzer.embedText(item.content.slice(0, 2000));
            embeddings.set(filePath, embedding);
          }
        } catch {
          // Skip embedding failures
        }
      }
    }

    if (embeddings.size > 0) {
      spinner.text = `Storing ${embeddings.size} embeddings...`;

      for (const [filePath, embedding] of embeddings.entries()) {
        try {
          const item = db.getAllItems().find((item) => item.filePath === filePath);
          if (item && item.id) {
            db.storeEmbedding(item.id, embedding);
            embeddingsCount++;
          }
        } catch {
          // Skip storage failures
        }
      }
    }
  } catch (error) {
    spinner.warn(`Embeddings generation partially failed: ${error instanceof Error ? error.message : error}`);
  }

  return embeddingsCount;
}

/**
 * Batch index command
 */
export async function batchIndexCommand(options: BatchIndexOptions): Promise<void> {
  console.log(`
${chalk.cyan('╔═══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.bold.white('K0ntext')} ${chalk.gray('Batch Index')}                                     ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.gray('Monorepo-aware batch indexing for large codebases')}        ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════════╝')}
`);

  const projectRoot = process.cwd();
  const batchSize = options.batchSize ? Number(options.batchSize) : 100;
  const maxFilesPerModule = options.maxFiles ? Number(options.maxFiles) : 500;
  const skipEmbeddings = options.skipEmbeddings || false;
  const verbose = options.verbose || false;

  const spinner = ora();
  let db: DatabaseClient | undefined;

  try {
    spinner.start('Analyzing monorepo structure...');

    // Detect monorepo modules
    const modules = detectMonorepoStructure(projectRoot);

    if (modules.length === 0) {
      spinner.warn('No modules detected. Are you in a project directory?');
      return;
    }

    spinner.succeed(`Detected ${modules.length} modules`);

    // Show detected modules
    console.log(chalk.bold('\nDetected Modules:'));
    for (const module of modules) {
      const fullPath = path.join(projectRoot, module.path);
      let fileCount = 0;

      try {
        const { glob } = await import('glob');
        const files = await glob('**/*.{ts,tsx,js,jsx,py,go,rs,java,cs,rb,php,md}', {
          cwd: fullPath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
          nodir: true
        });
        fileCount = files.length;
      } catch {
        // Ignore glob errors
      }

      console.log(
        `  ${chalk.cyan('•')} ${chalk.bold(module.name.padEnd(25))} ${chalk.gray(`(${fileCount} files`)}${chalk.gray(`) - ${module.description}`)}`
      );
    }

    console.log();

    // Initialize database
    spinner.start('Initializing database...');
    db = new DatabaseClient(projectRoot);
    spinner.succeed('Database initialized');

    // Initialize analyzer
    const analyzer = createIntelligentAnalyzer(projectRoot);
    const hasEmbeddings = hasOpenRouterKey() && !skipEmbeddings;

    if (!hasEmbeddings) {
      console.log(chalk.yellow('Note: OPENROUTER_API_KEY not set. Skipping semantic embeddings.'));
    }

    // Track overall progress
    const totalStats = {
      modulesProcessed: 0,
      docsIndexed: 0,
      codeIndexed: 0,
      configsIndexed: 0,
      embeddingsGenerated: 0,
      filesSkipped: 0
    };

    // Process each module
    for (const module of modules) {
      const modulePath = path.join(projectRoot, module.path);
      const moduleAnalyzer = createIntelligentAnalyzer(modulePath);

      spinner.start(`Processing module: ${module.name}...`);

      try {
        // Discover content in this module
        const [docs, code, tools] = await Promise.all([
          moduleAnalyzer.discoverDocs(),
          moduleAnalyzer.discoverCode(),
          moduleAnalyzer.discoverToolConfigs()
        ]);

        const totalFiles = docs.length + code.length + tools.length;

        if (totalFiles === 0) {
          spinner.info(`Skipping ${module.name} (no files found)`);
          continue;
        }

        spinner.text = `Processing ${module.name}: ${totalFiles} files found...`;

        // Apply per-module file limit
        const limitedCode = code.slice(0, maxFilesPerModule);

        // Split code into batches
        const codeBatches = splitIntoBatches(limitedCode, batchSize);

        // Index docs (no batching needed for docs usually)
        let moduleDocsIndexed = 0;
        for (const doc of docs) {
          const content = fs.existsSync(doc.path)
            ? fs.readFileSync(doc.path, 'utf-8').slice(0, 50000)
            : '';

          if (content) {
            db.upsertItem({
              type: 'doc',
              name: path.basename(doc.relativePath),
              content,
              filePath: doc.relativePath,
              metadata: {
                size: doc.size,
                module: module.name
              }
            });
            moduleDocsIndexed++;
          }
        }

        // Index tool configs
        let moduleConfigsIndexed = 0;
        for (const config of tools) {
          const content = fs.existsSync(config.path)
            ? fs.readFileSync(config.path, 'utf-8').slice(0, 50000)
            : '';

          if (content) {
            db.upsertItem({
              type: 'tool_config',
              name: `${config.tool}:${path.basename(config.relativePath)}`,
              content,
              filePath: config.relativePath,
              metadata: {
                tool: config.tool,
                size: config.size,
                module: module.name
              }
            });
            moduleConfigsIndexed++;
          }
        }

        // Index code in batches
        let moduleCodeIndexed = 0;
        const allIndexedCodePaths: string[] = [];

        for (let i = 0; i < codeBatches.length; i++) {
          const batch = codeBatches[i];
          spinner.text = `Processing ${module.name}: code batch ${i + 1}/${codeBatches.length} (${batch.length} files)...`;

          for (const codeFile of batch) {
            const content = fs.existsSync(codeFile.path)
              ? fs.readFileSync(codeFile.path, 'utf-8').slice(0, 20000)
              : '';

            if (content) {
              db.upsertItem({
                type: 'code',
                name: path.basename(codeFile.relativePath),
                content,
                filePath: codeFile.relativePath,
                metadata: {
                  size: codeFile.size,
                  module: module.name
                }
              });
              moduleCodeIndexed++;
              allIndexedCodePaths.push(codeFile.relativePath);
            }
          }

          if (verbose) {
            console.log(chalk.gray(`  Batch ${i + 1}/${codeBatches.length}: ${batch.length} files indexed`));
          }
        }

        // Generate embeddings for this module
        let moduleEmbeddings = 0;
        if (hasEmbeddings && allIndexedCodePaths.length > 0) {
          moduleEmbeddings = await generateEmbeddingsBatch(db, allIndexedCodePaths, analyzer, spinner);
        }

        // Update stats
        totalStats.modulesProcessed++;
        totalStats.docsIndexed += moduleDocsIndexed;
        totalStats.codeIndexed += moduleCodeIndexed;
        totalStats.configsIndexed += moduleConfigsIndexed;
        totalStats.embeddingsGenerated += moduleEmbeddings;

        if (code.length > maxFilesPerModule) {
          totalStats.filesSkipped += code.length - maxFilesPerModule;
        }

        spinner.succeed(
          `${module.name}: ${moduleDocsIndexed} docs, ${moduleCodeIndexed} code, ${moduleConfigsIndexed} configs` +
            (moduleEmbeddings > 0 ? `, ${moduleEmbeddings} embeddings` : '')
        );

      } catch (error) {
        spinner.fail(`${module.name} failed: ${error instanceof Error ? error.message : error}`);
        // Continue with next module
      }
    }

    // Final summary
    console.log();
    console.log(chalk.bold('Batch Index Summary:'));
    console.log(`  ${chalk.cyan('•')} Modules Processed:  ${totalStats.modulesProcessed}`);
    console.log(`  ${chalk.cyan('•')} Documentation Files: ${totalStats.docsIndexed}`);
    console.log(`  ${chalk.cyan('•')} Code Files:         ${totalStats.codeIndexed}`);
    console.log(`  ${chalk.cyan('•')} Config Files:       ${totalStats.configsIndexed}`);
    console.log(`  ${chalk.cyan('•')} Embeddings:         ${totalStats.embeddingsGenerated}`);

    if (totalStats.filesSkipped > 0) {
      console.log(`  ${chalk.yellow('•')} Files Skipped:      ${totalStats.filesSkipped} (hit max-files limit)`);
      console.log(chalk.gray(`\n  Tip: Use --max-files <n> to increase the limit per module`));
    }

    const totalIndexed = totalStats.docsIndexed + totalStats.codeIndexed + totalStats.configsIndexed;
    console.log(`  ${chalk.bold.green('✓')} Total Indexed:      ${totalIndexed} files`);

    db.close();

  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail('Batch indexing failed');
    }
    console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
    if (db) {
      db.close();
    }
    process.exit(1);
  }
}
