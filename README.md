# Email Verification & Validation Actor

Verify email addresses in bulk with comprehensive SMTP validation, syntax checking, and deliverability analysis. Powered by the robust [check-if-email-exists](https://github.com/reacherhq/check-if-email-exists) Rust engine.

## Features

✅ **SMTP Validation** - Connects to mail servers to verify if emails can receive messages  
✅ **Syntax Checking** - Validates email format according to RFC standards  
✅ **MX Record Verification** - Checks if domain has valid mail exchange records  
✅ **Catch-all Detection** - Identifies catch-all email addresses  
✅ **Disposable Email Detection** - Flags temporary/disposable email providers  
✅ **Bulk Processing** - Process thousands of emails with configurable concurrency  
✅ **Retry Logic** - Automatic retries for transient failures  
✅ **Proxy Support** - Optional SOCKS5 proxy for bypassing rate limits  
✅ **Self-contained** - Bundled Rust backend, no external dependencies needed

## Input Parameters

### Required

- **emails** (array of strings) - List of email addresses to verify
  - Example: `["user@example.com", "test@domain.org"]`

### Optional

- **backendUrl** (string) - Backend URL (default: `http://localhost:8080`)
  - Leave empty to use the bundled backend
  - Provide custom URL if using external backend

- **concurrency** (integer, 1-50, default: 5) - Number of parallel verifications
  - Higher values = faster processing
  - Lower values = less resource usage

- **retryCount** (integer, 0-5, default: 2) - Number of retry attempts
  - Helps handle transient network issues

- **timeout** (integer, 5-300 seconds, default: 30) - Request timeout
  - Maximum time to wait per email verification

- **proxy** (object, optional) - SOCKS5 proxy configuration
  - `host` (string) - Proxy hostname
  - `port` (integer) - Proxy port
  - `username` (string, optional) - Proxy auth username
  - `password` (string, optional) - Proxy auth password

## Output Format

Each verified email produces a record with the following structure:

```json
{
  "email": "user@example.com",
  "is_reachable": "safe",
  "syntax": {
    "is_valid_syntax": true,
    "address": "user@example.com",
    "domain": "example.com",
    "username": "user"
  },
  "mx": {
    "accepts_mail": true,
    "records": ["mail.example.com"]
  },
  "smtp": {
    "can_connect_smtp": true,
    "is_deliverable": true,
    "is_disabled": false,
    "has_full_inbox": false
  },
  "misc": {
    "is_disposable": false,
    "is_role_account": false
  },
  "attempts": 1
}
```

### Reachability Status

- **safe** - Email is valid and can receive messages
- **invalid** - Email address is invalid or doesn't exist
- **risky** - Email might exist but has issues (catch-all, full inbox, etc.)
- **unknown** - Unable to determine (server timeout, connection issues)

## Usage Examples

### Basic Email Verification

```json
{
  "emails": [
    "john.doe@gmail.com",
    "contact@company.com",
    "support@example.org"
  ]
}
```

### High-Volume Processing

```json
{
  "emails": ["email1@domain.com", "email2@domain.com", "..."],
  "concurrency": 20,
  "retryCount": 3,
  "timeout": 45
}
```

### Using Proxy

```json
{
  "emails": ["user@example.com"],
  "proxy": {
    "host": "proxy.example.com",
    "port": 1080,
    "username": "proxyuser",
    "password": "proxypass"
  }
}
```

## How It Works

1. **Syntax Validation** - Checks if email format is valid per RFC 5322
2. **DNS Lookup** - Verifies domain has MX (Mail Exchange) records
3. **SMTP Connection** - Connects to mail server and simulates sending
4. **Deliverability Check** - Verifies mailbox exists without sending actual email
5. **Additional Checks** - Detects disposable emails, role accounts, catch-all domains

## Performance & Limits

- **Processing Speed**: ~5-10 emails/second (depends on concurrency)
- **Recommended Batch Size**: Up to 10,000 emails per run
- **Memory Usage**: ~512MB-1GB
- **Timeout**: Default 30s per email (configurable)

## Common Use Cases

- **Marketing Lists** - Clean email lists before campaigns
- **User Registration** - Validate emails during signup
- **Data Quality** - Verify email databases
- **Lead Generation** - Validate collected email addresses
- **Compliance** - Remove invalid emails to improve deliverability

## Troubleshooting

### Backend Not Responding

If you see "Backend is not responding" error:
- The bundled backend takes ~5-10 seconds to start
- Check Actor logs for backend startup messages
- Increase timeout if needed

### High Failure Rate

If many emails fail verification:
- Check if emails are correctly formatted
- Verify your IP isn't blacklisted (use proxy if needed)
- Some mail servers have aggressive rate limiting
- Reduce concurrency to avoid overwhelming servers

### Timeout Errors

If emails timeout frequently:
- Increase timeout value (default: 30s)
- Some mail servers are slow to respond
- Check network connectivity
- Consider using a proxy

## Technical Details

### Architecture

This Actor uses a multi-stage Docker build:
1. **Rust Backend** - Compiled from check-if-email-exists source
2. **TypeScript Actor** - Orchestrates verification workflow
3. **ChromeDriver** - Required for some advanced checks

### Privacy & Security

- **No Data Storage** - Emails are processed in memory only
- **No Email Sending** - Only SMTP handshake, no actual emails sent
- **Secure Communication** - TLS/SSL for SMTP connections
- **Open Source** - Based on open-source check-if-email-exists

## Resources

- [check-if-email-exists GitHub](https://github.com/reacherhq/check-if-email-exists)
- [Apify Platform Documentation](https://docs.apify.com)
- [Email Validation Best Practices](https://docs.apify.com/academy)

## Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review Actor logs for detailed error messages
- Open an issue on GitHub

## License

This Actor uses check-if-email-exists which is licensed under AGPL-3.0.
