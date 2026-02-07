#!/bin/bash
#
# k0ntext Pre-Commit Hook
#
# Automatic context synchronization workflow:
# 1. Run autosync (sync from source of truth)
# 2. Run validation (check for errors)
# 3. Run drift-detect (AI-powered drift check)
# 4. If drift found, run cross-sync
# 5. Commit updated context files
#
# @version 3.1.0
#

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Get repository root
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT" || exit 0

# Check if k0ntext is available
K0NTEXT_CMD=""

if command -v k0ntext &> /dev/null; then
    K0NTEXT_CMD="k0ntext"
elif command -v npx &> /dev/null; then
    K0NTEXT_CMD="npx k0ntext"
else
    # No k0ntext available, skip
    exit 0
fi

# Check if we should skip (K0NTEXT_SKIP_HOOKS env variable)
if [ "$K0NTEXT_SKIP_HOOKS" = "true" ] || [ "$K0NTEXT_SKIP_HOOKS" = "1" ]; then
    exit 0
fi

# Check if OPENROUTER_API_KEY is set for AI operations
if [ -z "$OPENROUTER_API_KEY" ]; then
    # No API key, skip AI-powered checks but do basic validation
    echo -e "${BLUE}k0ntext: Pre-commit validation (basic mode)${NC}"
    echo -e "${YELLOW}⚠ OPENROUTER_API_KEY not set, skipping AI-powered drift detection${NC}"
    echo -e "${CYAN}  Set OPENROUTER_API_KEY for intelligent drift detection${NC}"

    # Still run validation if available
    if $K0NTEXT_CMD validate --help &> /dev/null; then
        echo -e "${GREEN}Step 1: Validating context files...${NC}"
        if $K0NTEXT_CMD validate 2> /dev/null; then
            echo -e "${GREEN}✓ Validation passed${NC}"
        else
            echo -e "${YELLOW}⚠ Validation had warnings${NC}"
        fi
    fi

    exit 0
fi

echo -e "${BLUE}k0ntext: Pre-commit workflow${NC}"

# Get list of staged files to determine if we need to run checks
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null)

# Check if any relevant files are being committed
RELEVANT_FILES=false
for file in $STAGED_FILES; do
    case "$file" in
        *.ts|*.js|*.tsx|*.jsx|*.py|*.go|*.rs|*.java|*.md|CLAUDE.md|.cursorrules|.clinerules)
            RELEVANT_FILES=true
            break
            ;;
    esac
done

if [ "$RELEVANT_FILES" = false ]; then
    # No relevant files changed, skip full workflow
    exit 0
fi

# Step 1: Autosync from source of truth (if available)
echo -e "${GREEN}Step 1: Running autosync...${NC}"
if $K0NTEXT_CMD autosync --help &> /dev/null 2>&1; then
    if $K0NTEXT_CMD autosync 2>/dev/null; then
        echo -e "${GREEN}✓ Autosync complete${NC}"
    else
        echo -e "${YELLOW}⚠ Autosync had warnings, continuing...${NC}"
    fi
else
    echo -e "${YELLOW}○ Autosync not available${NC}"
fi

# Step 2: Validate context files
echo -e "${GREEN}Step 2: Validating context files...${NC}"
if $K0NTEXT_CMD validate --help &> /dev/null 2>&1; then
    if $K0NTEXT_CMD validate 2>/dev/null; then
        echo -e "${GREEN}✓ Validation passed${NC}"
    else
        echo -e "${RED}✖ Validation failed${NC}"
        echo -e "${YELLOW}  Run 'k0ntext validate --fix' to fix errors${NC}"
        echo -e "${YELLOW}  To skip: git commit --no-verify${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}○ Validation not available${NC}"
fi

# Step 3: AI-powered drift detection
echo -e "${GREEN}Step 3: Detecting documentation drift...${NC}"
if $K0NTEXT_CMD drift-detect --help &> /dev/null 2>&1; then
    # Run drift detection with output capture
    DRIFT_OUTPUT=$($K0NTEXT_CMD drift-detect --max-files 10 2>&1)
    DRIFT_EXIT=$?

    if [ $DRIFT_EXIT -eq 0 ]; then
        echo -e "${GREEN}✓ No drift detected${NC}"
    else
        echo -e "${YELLOW}⚠ Drift detected, running cross-sync...${NC}"

        # Step 4: Cross-sync affected files
        if $K0NTEXT_CMD cross-sync --help &> /dev/null 2>&1; then
            if $K0NTEXT_CMD cross-sync --affected "$STAGED_FILES" 2>/dev/null; then
                echo -e "${GREEN}✓ Cross-sync complete${NC}"

                # Add newly synced files to commit
                git add AI_CONTEXT.md 2>/dev/null
                git add .github/copilot-instructions.md 2>/dev/null
                git add .clinerules 2>/dev/null
                git add .windsurf/rules.md 2>/dev/null
                git add .aider.conf.yml 2>/dev/null
                git add .continue/config.json 2>/dev/null
                git add .cursorrules 2>/dev/null
                git add .gemini/config.md 2>/dev/null
                git add CLAUDE.md 2>/dev/null
                git add .claude/context/ 2>/dev/null

                echo -e "${BLUE}ℹ Updated context files added to commit${NC}"
            else
                echo -e "${YELLOW}⚠ Cross-sync had issues${NC}"
                echo -e "${YELLOW}  Run 'k0ntext cross-sync' manually after commit${NC}"
            fi
        else
            echo -e "${YELLOW}○ Cross-sync not available${NC}"
        fi
    fi
else
    echo -e "${YELLOW}○ Drift detection not available${NC}"
fi

echo -e "${GREEN}✓ Pre-commit workflow complete${NC}"
exit 0
