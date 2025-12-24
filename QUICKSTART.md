# Quick Start Guide - Email Checker Actor

## Build the Docker Image

```bash
cd "c:\Users\asus\OneDrive\Desktop\Running Node\email-checker\email-checker"
docker build -t email-checker-actor .
```

**Note:** Build takes ~5-10 minutes due to Rust compilation.

## Test Locally with Docker

```bash
# Run the container
docker run -p 8080:8080 -v "%cd%\apify_storage:/home/chrome/apify_storage" email-checker-actor
```

## Test with Apify CLI

```bash
# Install Apify CLI if needed
npm install -g apify-cli

# Run locally
apify run -p

# Or with custom input
apify run -p --input-file input.json
```

## Sample Input (input.json)

```json
{
  "emails": [
    "test@example.com",
    "user@gmail.com"
  ],
  "concurrency": 5,
  "retryCount": 2,
  "timeout": 30
}
```

## Deploy to Apify

```bash
# Login to Apify
apify login

# Push to Apify platform
apify push
```

## Check Results

Results are saved to the default dataset. You can view them:
- In Apify Console: Dataset tab
- Locally: `apify_storage/datasets/default/`
- Via API: Actor run output

## Troubleshooting

**Backend not starting?**
- Check logs: `docker logs <container-id>`
- Verify port 8080 is free

**Build failing?**
- Ensure Docker has enough memory (4GB+)
- Check internet connection for dependencies

**Emails failing?**
- Verify email format
- Check network connectivity
- Try with known-good email (e.g., test@gmail.com)
