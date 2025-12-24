# Email Verification & Validation

Verify email addresses in bulk with comprehensive SMTP validation, syntax checking, and deliverability analysis.

## Why Use This Actor?

- ✅ **Accurate SMTP Validation** - Actually connects to mail servers
- ✅ **Fast Bulk Processing** - Verify thousands of emails quickly
- ✅ **No External Dependencies** - Self-contained Rust engine
- ✅ **Detailed Results** - Get comprehensive validation data
- ✅ **Privacy Focused** - No data storage, no emails sent

## Quick Start

```json
{
  "emails": [
    "john.doe@gmail.com",
    "contact@company.com"
  ]
}
```

## What You Get

For each email, you'll receive:
- **Reachability status** (safe/invalid/risky/unknown)
- **Syntax validation** (RFC 5322 compliance)
- **MX record verification** (domain accepts mail)
- **SMTP deliverability** (mailbox exists)
- **Disposable email detection**
- **Catch-all detection**
- **Role account detection**

## Common Use Cases

- Clean marketing email lists
- Validate user registrations
- Improve email deliverability
- Data quality assurance
- Lead generation validation

## Advanced Features

- **Configurable concurrency** - Process up to 50 emails in parallel
- **Automatic retries** - Handle transient failures gracefully
- **SOCKS5 proxy support** - Bypass rate limits
- **Customizable timeouts** - Control verification speed

## Powered By

Built on [check-if-email-exists](https://github.com/reacherhq/check-if-email-exists), a battle-tested Rust library trusted by developers worldwide.
