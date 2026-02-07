/**
 * Hooks Command
 *
 * Git hooks management for k0ntext.
 *
 * @version 3.1.0
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Hooks management command group
 */
export const hooksCommand = new Command('hooks')
  .description('Manage git hooks for automatic context synchronization')
  .action(() => {
    // Show help if no subcommand provided
    hooksCommand.help();
  });

/**
 * Install git hooks
 */
hooksCommand
  .command('install')
  .description('Install git hooks for automatic context synchronization')
  .option('-f, --force', 'Overwrite existing hooks')
  .option('--skip-backup', 'Skip backing up existing hooks')
  .action(async (options) => {
    const projectRoot = process.cwd();
    const hooksDir = path.join(projectRoot, '.git', 'hooks');
    const preCommitTarget = path.join(hooksDir, 'pre-commit');
    const postCommitTarget = path.join(hooksDir, 'post-commit');

    try {
      // Check if we're in a git repository
      const gitDir = path.join(projectRoot, '.git');
      try {
        const stats = await fs.stat(gitDir);
        if (!stats.isDirectory()) {
          throw new Error('Not a directory');
        }
      } catch {
        console.error(chalk.red('Error: Not in a git repository'));
        console.error(chalk.dim('Initialize a git repository first with: git init'));
        process.exit(1);
      }

      // Ensure hooks directory exists
      await fs.mkdir(hooksDir, { recursive: true });

      // Get the hook scripts from the package
      const pkgDir = path.join(__dirname, '../../../.claude/automation/hooks');
      const preCommitSource = path.join(pkgDir, 'pre-commit.sh');
      const postCommitSource = path.join(pkgDir, 'post-commit.sh');

      // Check if source hooks exist
      try {
        await fs.access(preCommitSource);
      } catch {
        console.error(chalk.red('Error: Hook scripts not found in package'));
        console.error(chalk.dim(`Expected: ${preCommitSource}`));
        process.exit(1);
      }

      // Backup existing hooks if they exist
      const backupDir = path.join(projectRoot, '.git', 'hooks', 'backup');

      const installHook = async (source: string, target: string, name: string) => {
        try {
          await fs.access(target);
          // Hook exists
          if (!options.force) {
            console.log(chalk.yellow(`  ⚠ ${name} already exists (use --force to overwrite)`));
            return false;
          }

          // Backup existing hook
          if (!options.skipBackup) {
            await fs.mkdir(backupDir, { recursive: true });
            const backupPath = path.join(backupDir, `${name}.backup-${Date.now()}`);
            await fs.copyFile(target, backupPath);
            console.log(chalk.dim(`    Backed up existing ${name} to: ${backupPath}`));
          }
        } catch {
          // Hook doesn't exist, that's fine
        }

        // Copy the hook
        const content = await fs.readFile(source, 'utf-8');
        await fs.writeFile(target, content, { mode: 0o755 });
        console.log(chalk.green(`  ✓ Installed ${name}`));
        return true;
      };

      console.log(chalk.bold('\n📦 Installing k0ntext git hooks...\n'));

      // Install pre-commit hook
      const preCommitInstalled = await installHook(
        preCommitSource,
        preCommitTarget,
        'pre-commit'
      );

      // Install post-commit hook (if it exists)
      try {
        await fs.access(postCommitSource);
        await installHook(
          postCommitSource,
          postCommitTarget,
          'post-commit'
        );
      } catch {
        // Post-commit hook is optional
        console.log(chalk.dim('  ○ post-commit not available (optional)'));
      }

      console.log(chalk.bold('\n✓ Git hooks installed successfully!\n'));

      console.log(chalk.bold('What happens on commit:'));
      console.log(chalk.gray('  1. Autosync - Sync context from source of truth'));
      console.log(chalk.gray('  2. Validate - Check for context errors'));
      console.log(chalk.gray('  3. Drift Detect - AI-powered drift detection'));
      console.log(chalk.gray('  4. Cross-Sync - Update all AI tool contexts'));
      console.log(chalk.gray('  5. Auto-add - Include updated context in commit\n'));

      console.log(chalk.bold('Tips:'));
      console.log(chalk.cyan('  • Set OPENROUTER_API_KEY for AI-powered drift detection'));
      console.log(chalk.cyan('  • Use K0NTEXT_SKIP_HOOKS=1 to temporarily skip hooks'));
      console.log(chalk.cyan('  • Use git commit --no-verify to bypass hooks\n'));

    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Uninstall git hooks
 */
hooksCommand
  .command('uninstall')
  .description('Uninstall k0ntext git hooks')
  .option('--keep-backups', 'Keep backup files')
  .action(async (options) => {
    const projectRoot = process.cwd();
    const hooksDir = path.join(projectRoot, '.git', 'hooks');
    const preCommitTarget = path.join(hooksDir, 'pre-commit');
    const postCommitTarget = path.join(hooksDir, 'post-commit');
    const backupDir = path.join(hooksDir, 'backup');

    try {
      console.log(chalk.bold('\n🗑️  Uninstalling k0ntext git hooks...\n'));

      // Check if pre-commit hook exists
      try {
        await fs.access(preCommitTarget);
        await fs.unlink(preCommitTarget);
        console.log(chalk.green('  ✓ Removed pre-commit hook'));
      } catch {
        console.log(chalk.dim('  ○ pre-commit hook not found'));
      }

      // Check if post-commit hook exists
      try {
        await fs.access(postCommitTarget);
        await fs.unlink(postCommitTarget);
        console.log(chalk.green('  ✓ Removed post-commit hook'));
      } catch {
        console.log(chalk.dim('  ○ post-commit hook not found'));
      }

      // Remove backups unless requested to keep
      if (!options.keepBackups) {
        try {
          await fs.rm(backupDir, { recursive: true, force: true });
          console.log(chalk.dim('  ✓ Removed backup files'));
        } catch {
          // Backup dir doesn't exist or can't be removed
        }
      }

      console.log(chalk.bold('\n✓ Git hooks uninstalled!\n'));

    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Show hooks status
 */
hooksCommand
  .command('status')
  .description('Show git hooks installation status')
  .action(async () => {
    const projectRoot = process.cwd();
    const hooksDir = path.join(projectRoot, '.git', 'hooks');

    try {
      console.log(chalk.bold('\n📊 Git Hooks Status\n'));

      const checkHook = async (name: string, filePath: string) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const hasK0ntext = content.includes('k0ntext') || content.includes('K0NTEXT');

          if (hasK0ntext) {
            console.log(chalk.green(`  ✓ ${name}: Installed`));
          } else {
            console.log(chalk.yellow(`  ○ ${name}: Other hook installed`));
          }
        } catch {
          console.log(chalk.dim(`  - ${name}: Not installed`));
        }
      };

      await checkHook('pre-commit', path.join(hooksDir, 'pre-commit'));
      await checkHook('post-commit', path.join(hooksDir, 'post-commit'));

      // Check for OPENROUTER_API_KEY
      const hasApiKey = process.env.OPENROUTER_API_KEY;
      console.log();
      if (hasApiKey) {
        console.log(chalk.green(`  ✓ OPENROUTER_API_KEY: Set`));
      } else {
        console.log(chalk.yellow(`  ○ OPENROUTER_API_KEY: Not set (AI features disabled)`));
      }

      console.log();

    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });
