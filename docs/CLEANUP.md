# Context Cleanup

The context cleanup feature helps you remove leftover context folders from various AI tools that may be cluttering your project directory.

## Usage

```bash
k0ntext cleanup [options]
```

## Options

- `--dry-run` - Show what would be removed without actually deleting anything
- `--keep <folders>` - Folders to keep (comma-separated list)
- `--verbose` - Show detailed output during cleanup

## Examples

### Basic cleanup (dry run)
```bash
k0ntext cleanup --dry-run
```

### Clean up with specific folders to keep
```bash
k0ntext cleanup --keep .vscode,.github
```

### Full cleanup with verbose output
```bash
k0ntext cleanup --verbose
```

## Folders Cleaned

The cleanup agent removes the following tool-specific folders:

- `.cursor` - Cursor AI tool
- `.windsurf` - Windsurf AI tool
- `.cline` - Cline AI tool
- `.aider` - Aider AI tool
- `.continue` - Continue AI tool
- `.copilot` - GitHub Copilot
- `.cursorrules` - Cursor rules
- `.ai-context` - Legacy AI context folders
- `.github` - GitHub configuration
- `.vscode` - VSCode settings
- `.idea` - IntelliJ IDEA settings
- `.devcontainer` - Dev container configuration

## Safety Features

- **Dry Run Mode**: Always run with `--dry-run` first to see what will be removed
- **Keep Option**: Specify folders to preserve using the `--keep` flag
- **Verbose Output**: See detailed information about what's being processed
- **Error Handling**: Errors during removal are caught and reported without stopping the process

## Best Practices

1. Always run with `--dry-run` first to review what will be removed
2. Use the `--keep` option to preserve important configuration folders
3. Backup your project before running a full cleanup
4. Run cleanup periodically to maintain a clean project structure

## Troubleshooting

If you encounter permission errors:
- Ensure you have proper file system permissions
- Try running with elevated privileges if needed
- Check if folders are in use by running processes

## Related Commands

- `k0ntext init` - Initialize AI context for a project
- `k0ntext index` - Index codebase content into the database
- `k0ntext sync` - Sync across AI tools