# task-management-mvp

Task Management MVP using Graph-OS v4

A Graph-OS application using the **Isomorphic Pattern** - cartridges are loaded via HTTP fetch for browser-native execution.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
task-management-mvp/
├── cartridges/           # Cartridge definitions
│   ├── root.cartridge.json
│   └── composites/      # Composite cartridges
├── registries/          # Signal and composite registries
│   ├── signal-registry.json
│   └── composite-registry.json
├── src/                 # React application
│   ├── App.tsx          # Main app with runtime initialization
│   └── main.tsx         # React entry point
├── public/              # Static assets
├── package.json
├── vite.config.js
└── graph-os.config.json
```

## Isomorphic Pattern

This project uses the **Isomorphic Pattern** for loading cartridges:

```typescript
// Cartridges are loaded via HTTP fetch
const response = await fetch('/cartridges/root.cartridge.json');
const cartridge = await response.json();

// Runtime is initialized with data, not file paths
const runtime = await createRuntime({ cartridge });
```

This enables:
- Browser-native execution without build-time coupling
- Hot reload of cartridges without rebuild
- CDN deployment of cartridge files

## Documentation

- [Graph-OS Documentation](https://github.com/graph-os/graph-os)
