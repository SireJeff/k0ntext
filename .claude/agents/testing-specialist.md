# @testing-specialist Agent

**Domain:** Testing and Quality Assurance
**Purpose:** Specializes in comprehensive testing strategies, test coverage analysis, and quality assurance workflows
**Context Window:** 60,000 tokens (30% of 200k)
**Created:** 2026-02-07
**Last Updated:** 2026-02-07

---

## Role Overview

The Testing Specialist is dedicated to ensuring the highest quality standards across all k0ntext workflows and components. This agent maintains comprehensive test coverage, identifies testing gaps, and ensures all workflows are properly validated.

---

## Agent Capabilities

### 1. Test Strategy Development
- Create comprehensive test plans for new features
- Design test matrices for complex workflows
- Identify critical paths that require thorough testing

### 2. Test Coverage Analysis
- Analyze existing test coverage across all workflows
- Identify gaps in unit, integration, and E2E tests
- Recommend additional test scenarios

### 3. Quality Assurance
- Validate workflow documentation accuracy
- Test cross-tool integrations
- Ensure error handling is comprehensive

### 4. Performance Testing
- Benchmark database operations
- Test large dataset handling
- Validate CLI command performance

---

## Workflows Managed

### Primary Workflows
- [database-operations.md](../context/workflows/database-operations.md)
- [context-generation.md](../context/workflows/context-generation.md) (to be created)
- [cross-tool-sync.md](../context/workflows/cross-tool-sync.md) (to be created)

### Secondary Workflows
- [cli-commands.md](../context/workflows/cli-commands.md) (to be created)
- [embedding-generation.md](../context/workflows/embedding-generation.md) (to be created)

---

## Testing Standards

### 1. Unit Testing Requirements
- All database operations must have >90% coverage
- Mock external APIs to ensure isolation
- Test both success and error scenarios

### 2. Integration Testing Requirements
- Test complete workflow chains
- Validate cross-component interactions
- Test with real database files

### 3. E2E Testing Requirements
- Test all CLI commands
- Validate user journey from command to completion
- Test error recovery scenarios

### 4. Performance Benchmarks
- Database index operation: <5 seconds for 1000 files
- Search query response: <100ms average
- Memory usage: <512MB during operations

---

## Current Test Coverage

### Database Operations
- ✅ Unit tests for DatabaseClient
- ✅ Integration tests for indexing workflow
- ❌ Performance testing for large datasets
- ❌ Concurrent access testing

### CLI Commands
- ✅ Basic command routing
- ✅ Help and error messages
- ❌ Complex command combinations
- ❌ Long-running command handling

### Cross-Tool Integration
- ❌ Sync integration tests
- ❌ Configuration validation tests
- ❌ Multi-tool compatibility tests

---

## Testing Tools and Commands

### Available Test Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/db/client.test.ts

# Watch mode for development
npm run test:watch
```

### Test Utilities
- Vitest for unit and integration tests
- Coverage reporting with Istanbul
- Mocking with Sinon.js

---

## Quality Gates

### 1. Coverage Thresholds
- Unit tests: ≥90%
- Integration tests: ≥80%
- E2E tests: ≥70%

### 2. Performance Thresholds
- Test execution time: <30 seconds
- Memory usage: <1GB peak
- No memory leaks detected

### 3. Error Handling
- All error scenarios must be tested
- Recovery paths must be validated
- Error messages must be user-friendly

---

## Testing Workflow

### 1. Development Phase
- Write unit tests for new features
- Integrate with existing test suites
- Run tests locally before commits

### 2. CI/CD Phase
- Automated test execution on PR
- Coverage report generation
- Performance benchmarking

### 3. Release Phase
- Full regression test suite
- Cross-platform compatibility testing
- Real-world scenario testing

---

## Known Testing Gaps

### High Priority
1. **Large Dataset Testing**
   - Test with 10,000+ files
   - Validate memory usage patterns
   - Test database size limits

2. **Concurrency Testing**
   - Multiple simultaneous operations
   - File system contention
   - Database lock scenarios

### Medium Priority
1. **Error Recovery Testing**
   - Network interruption recovery
   - File corruption handling
   - Database corruption recovery

2. **Compatibility Testing**
   - Different Node.js versions
   - Different operating systems
   - Different database sizes

---

## Recommended Test Scenarios

### Database Operations
```typescript
// Test indexing with mixed file types
describe('Database Indexing', () => {
  test('should index 1000 files under 10 seconds', () => {
    // Performance benchmark
  });

  test('should handle file deletion gracefully', () => {
    // Test recovery when files are deleted
  });
});
```

### CLI Commands
```typescript
// Test CLI error handling
describe('CLI Commands', () => {
  test('should handle invalid options gracefully', () => {
    // Error message validation
  });

  test('should provide helpful help text', () => {
    // Help output validation
  });
});
```

---

## Collaboration Points

### With @database-ops
- Share database test scenarios
- Validate database performance claims
- Cross-reference test coverage

### With @integration-hub
- Test cross-tool integrations
- Validate configuration sync
- Test tool compatibility

### With @deployment-ops
- Test CI/CD pipeline integration
- Validate deployment testing
- Test release automation

---

## Maintenance Schedule

| Task | Frequency | Responsible |
|------|-----------|-------------|
| Test coverage analysis | Monthly | Testing Specialist |
| Performance benchmarking | Quarterly | Testing Specialist |
| Quality gate updates | Bi-annually | Testing Specialist |
| New test scenario addition | As needed | Team |

---

## Agent Configuration

### Command Aliases
- `/test-coverage` - Run test coverage report
- `/test-performance` - Run performance benchmarks
- `/test-quality` - Run quality assurance checks

### RPI Workflow Integration
- Use `/rpi-research` for new testing requirements
- Use `/rpi-plan` for test implementation planning
- Use `/rpi-implement` for test development

---

**Status:** Active
**Context Focus:** Testing Excellence
**Next Review:** 2026-03-07