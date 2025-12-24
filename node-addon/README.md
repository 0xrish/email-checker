# check-if-email-exists-node

Node.js native addon for the `check-if-email-exists` Rust library. This allows you to directly call the Rust email verification functions from Node.js/TypeScript without making HTTP requests.

## Building

To build the native addon, you need Rust installed. Then run:

```bash
cd node-addon
npm install
npm run build
```

Or use cargo directly:

```bash
cd node-addon
cargo build --release
```

## Usage

```typescript
import { verifyEmail } from 'check-if-email-exists-node';

const result = await verifyEmail({
    to_email: 'test@example.com',
    proxy: {
        host: 'proxy.example.com',
        port: 1080,
        username: 'user',
        password: 'pass'
    }
});

const parsed = JSON.parse(result);
console.log(parsed);
```

## API

### `verifyEmail(request: CheckEmailRequest): Promise<string>`

Verifies an email address and returns a JSON string with the verification results.

#### Parameters

- `request.to_email` (string, required): The email address to verify
- `request.proxy` (ProxyConfig, optional): SOCKS5 proxy configuration
- `request.from_email` (string, optional): Email address to use in SMTP FROM command
- `request.hello_name` (string, optional): Hostname to use in SMTP EHLO command

#### Returns

A Promise that resolves to a JSON string containing the verification results.

