# Codebase Organization Rules

## Root Directory Policy

### ✅ ALLOWED in Root
- Package management: `package.json`, `package-lock.json`, `yarn.lock`
- Build config: `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`
- Environment: `.env*`, `.gitignore`, `.gitattributes`
- CI/CD: `.github/`, `Dockerfile`, `docker-compose.yml`
- Documentation: `README.md`, `CHANGELOG.md`, `CLAUDE.md`
- License: `LICENSE`, `LICENSE.md`

### ❌ FORBIDDEN in Root
- **Documentation files** (`.md`) except allowlist above
- **SQL files** (`.sql`) of any kind
- **Temporary files** (`.tmp`, `.temp`, `.bak`)
- **IDE configs** outside `.vscode/` or `.idea/`
- **Build artifacts** (`dist/`, `build/`, `*.tgz`)

## File Organization Structure

### 📁 Documentation (`/docs/`)
```
docs/
├── adr/           # Architecture Decision Records
├── notes/         # Development notes, analysis, debug reports  
├── api/           # API documentation, function summaries
├── guides/        # Setup guides, user guides, tutorials
└── archive/       # Legacy/obsolete documentation
```

### 🗃️ Database (`/db/`)
```
db/
├── migrations/    # Schema changes, DDL scripts
├── seeds/         # Sample data, initial data
├── adhoc/         # One-time fixes, maintenance scripts
└── archive/       # Obsolete/legacy SQL scripts
```

## Automated Enforcement

### GitHub Actions
- File hygiene check runs on all PRs
- Blocks merge if stray files found in root
- Validates required directory structure exists

### Pre-commit Hooks (Recommended)
```bash
# Add to .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: file-hygiene
        name: File Hygiene Check
        entry: ./scripts/check-file-hygiene.sh
        language: script
        always_run: true
```

## Developer Workflow

### Before Creating Files
1. **Documentation**: Always create in appropriate `/docs/` subdirectory
2. **SQL Scripts**: Always create in appropriate `/db/` subdirectory  
3. **Temporary Work**: Use `/tmp/` or proper temp directories

### Code Review Checklist
- [ ] No stray `.md` files in root (except allowlist)
- [ ] No `.sql` files in root
- [ ] Files are in correct organizational directories
- [ ] Directory structure follows established patterns

## Migration Guide

### Moving Existing Files
1. **Identify file purpose and content**
2. **Choose appropriate target directory**
3. **Update any references in code/docs**
4. **Test that functionality is preserved**

### Common Migration Patterns
- `debug-report.md` → `docs/notes/debug-report.md`
- `database-schema.sql` → `db/migrations/database-schema.sql`  
- `setup-guide.md` → `docs/guides/setup-guide.md`
- `architecture-doc.md` → `docs/adr/architecture-doc.md`

## Maintenance

### Monthly Review
- Check for new stray files
- Review `/docs/archive/` and `/db/archive/` for cleanup
- Update this guide as patterns evolve

### Tools
- GitHub Actions workflow: `.github/workflows/file-hygiene-check.yml`
- Manual check: `find . -maxdepth 1 -name "*.md" -o -name "*.sql"`