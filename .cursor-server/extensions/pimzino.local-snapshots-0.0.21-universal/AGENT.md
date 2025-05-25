# Local Snapshots Extension Agent Guidelines

## Commands
- Build: `npm run compile` or `npm run package`
- Lint: `npm run lint`
- Test: `npm run test`
- Watch mode: `npm run watch`

## Code Style
- TypeScript with strict mode enabled
- Use explicit types for function parameters and return values
- Use async/await for asynchronous operations
- Error handling: Use try/catch blocks and provide descriptive error messages
- Follow VS Code extension patterns for registering commands, webviews, etc.