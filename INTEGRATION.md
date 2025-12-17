# Integration of Apify Actor with Rust Backend

This document explains how the Apify actor has been integrated with the Rust backend to directly call functions instead of making HTTP requests.

## Overview

The integration creates a Node.js native addon using `napi-rs` that wraps the Rust `check_email` function from the `check-if-email-exists` core library. This allows the TypeScript Apify actor to directly call the Rust email verification functions without needing an HTTP server.

## Architecture

```
┌─────────────────┐
│  Apify Actor    │
│  (TypeScript)   │
└────────┬────────┘
         │
         │ import { verifyEmail }
         │
         ▼
┌─────────────────┐
│  Node.js Addon  │
│  (napi-rs)      │
└────────┬────────┘
         │
         │ FFI call
         │
         ▼
┌─────────────────┐
│  Rust Core      │
│  check_email()  │
└─────────────────┘
```

## Changes Made

### 1. Created Node.js Native Addon (`node-addon/`)

- **`Cargo.toml`**: Rust crate configuration for the native addon
- **`src/lib.rs`**: Rust code that exposes `verify_email` function via napi-rs
- **`build.rs`**: Build script for napi-rs
- **`index.ts`**: TypeScript wrapper that imports the native addon
- **`package.json`**: Node.js package configuration for the addon

### 2. Updated Apify Actor (`src/main.ts`)

- Removed HTTP fetch calls to backend
- Added import of `verifyEmail` from the native addon
- Updated input interface to remove `backendUrl` field
- Changed to directly call `verifyEmail()` function

### 3. Updated Configuration Files

- **`package.json`**: Added dependency on `check-if-email-exists-node` and build scripts
- **`.actor/input_schema.json`**: Removed `backendUrl` requirement, added `from_email` and `hello_name` options
- **`.actor/actor.json`**: Updated description to reflect native backend usage
- **`Cargo.toml`**: Added `node-addon` to workspace members

### 4. Updated Dockerfile

- Added Rust installation step
- Added build step for the native addon before building TypeScript
- Added copy step for the built `.node` file

## Building

### Local Development

1. Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

2. Build the native addon:
   ```bash
   cd node-addon
   cargo build --release
   ```

3. Install Node.js dependencies:
   ```bash
   npm install
   ```

4. Build TypeScript:
   ```bash
   npm run build
   ```

### Docker Build

The Dockerfile automatically:
1. Installs Rust
2. Builds the native addon
3. Builds the TypeScript code
4. Copies all necessary files

## Usage

### Input Format

```json
{
  "emails": ["test@example.com", "another@example.com"],
  "proxy": {
    "host": "proxy.example.com",
    "port": 1080,
    "username": "user",
    "password": "pass"
  },
  "from_email": "sender@example.com",
  "hello_name": "example.com"
}
```

### Code Example

```typescript
import { verifyEmail } from 'check-if-email-exists-node';

const result = await verifyEmail({
    to_email: 'test@example.com',
    proxy: {
        host: 'proxy.example.com',
        port: 1080
    }
});

const parsed = JSON.parse(result);
console.log(parsed.is_reachable); // 'safe', 'risky', 'invalid', or 'unknown'
```

## Benefits

1. **No HTTP overhead**: Direct function calls are faster than HTTP requests
2. **No separate server needed**: Everything runs in the same process
3. **Type safety**: TypeScript types are maintained through the FFI boundary
4. **Same functionality**: All features of the Rust backend are available

## Limitations

1. **Platform-specific builds**: The native addon must be built for each target platform
2. **Build complexity**: Requires Rust toolchain to build
3. **Binary size**: The native addon increases the Docker image size

## Troubleshooting

### Build Issues

- Ensure Rust is installed: `rustc --version`
- Ensure Cargo is in PATH: `cargo --version`
- Check that all workspace members are present in `Cargo.toml`

### Runtime Issues

- Ensure the `.node` file is copied to the correct location
- Check that the native addon matches the Node.js version
- Verify platform compatibility (Linux x64 for Docker)

