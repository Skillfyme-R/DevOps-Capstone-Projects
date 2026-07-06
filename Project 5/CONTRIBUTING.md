# Contributing to FluxStream

Thank you for your interest in contributing to FluxStream!

## Development Setup

See the [README](README.md) for full local development setup instructions.

## Code Standards

### Elixir

- Run `mix format` before committing
- All code must pass `mix credo --strict`
- Security audit: `mix sobelow --config`
- New features require tests — aim for >80% coverage
- No `IO.inspect` or debug prints in production code

### TypeScript / React

- `npm run type-check` must pass (zero type errors)
- `npm run lint` must pass with zero warnings
- Components should be single-responsibility
- Use `styled-components` for styling (no inline styles)
- GraphQL operations go in component files or `src/graph/`

## Pull Request Process

1. Branch from `develop` — name: `feat/your-feature` or `fix/issue-description`
2. Write tests for new functionality
3. Ensure all CI checks pass
4. Request review from at least one maintainer
5. Squash commits before merging

## Commit Convention

```
feat(catalog): add genre-based content filtering
fix(player): resolve HLS token expiry on seek
docs(api): document stream endpoint signing
test(transcoding): add retry exhaustion coverage
chore(deps): upgrade phoenix to 1.7.14
```

## Reporting Issues

For playback bugs or platform issues, use the in-app Support page.
For security vulnerabilities, email security@fluxstream.io.
