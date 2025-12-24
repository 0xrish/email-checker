import { Actor, log } from 'apify';

interface ProxyConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
}

interface Input {
    emails?: string[];
    backendUrl?: string;
    proxy?: ProxyConfig;
    concurrency?: number;
    retryCount?: number;
    timeout?: number;
}

interface CheckIfEmailExistsResult {
    input: string;
    is_reachable: string;
    misc?: Record<string, unknown>;
    mx?: Record<string, unknown>;
    smtp?: Record<string, unknown>;
    syntax?: Record<string, unknown>;
    [key: string]: unknown;
}

interface EmailResult {
    email: string;
    result?: CheckIfEmailExistsResult;
    error?: string;
    attempts?: number;
}

/**
 * Check if backend is healthy
 */
async function checkBackendHealth(backendUrl: string, maxRetries = 30): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const healthUrl = new URL('/health', backendUrl).toString();
            const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });
            
            if (response.ok) {
                log.info(`Backend is healthy at ${backendUrl}`);
                return true;
            }
        } catch (error) {
            log.debug(`Health check attempt ${i + 1}/${maxRetries} failed`);
        }
        
        if (i < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
    
    return false;
}

/**
 * Verify a single email with retry logic
 */
async function verifyEmail(
    email: string,
    backendUrl: string,
    proxy: ProxyConfig | undefined,
    retryCount: number,
    timeout: number,
): Promise<EmailResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            const url = new URL('/v0/check_email', backendUrl).toString();
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to_email: email,
                    ...(proxy ? { proxy } : {}),
                }),
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(
                    `Backend responded with status ${response.status} ${response.statusText}: ${text}`,
                );
            }
            
            const result = (await response.json()) as CheckIfEmailExistsResult;
            
            return {
                email,
                result,
                attempts: attempt + 1,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt < retryCount) {
                log.warning(`Attempt ${attempt + 1} failed for "${email}", retrying...`);
                await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }
    
    return {
        email,
        error: lastError?.message || 'Unknown error',
        attempts: retryCount + 1,
    };
}

/**
 * Process emails in batches with concurrency control
 */
async function processEmailsBatch(
    emails: string[],
    backendUrl: string,
    proxy: ProxyConfig | undefined,
    concurrency: number,
    retryCount: number,
    timeout: number,
): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    const queue = [...emails];
    const inProgress = new Set<Promise<void>>();
    
    while (queue.length > 0 || inProgress.size > 0) {
        while (inProgress.size < concurrency && queue.length > 0) {
            const email = queue.shift()!;
            
            const promise = (async () => {
                try {
                    const result = await verifyEmail(email, backendUrl, proxy, retryCount, timeout);
                    results.push(result);
                    
                    const item = {
                        email: result.email,
                        ...(result.result || {}),
                        ...(result.error ? { error: result.error } : {}),
                        attempts: result.attempts,
                    };
                    
                    await Actor.pushData(item);
                    
                    if (result.error) {
                        log.error(`Failed to verify "${email}": ${result.error}`);
                    } else {
                        log.info(`Verified "${email}" - is_reachable: ${result.result?.is_reachable}`);
                    }
                } catch (error) {
                    log.exception(error as Error, `Unexpected error processing "${email}"`);
                }
            })();
            
            inProgress.add(promise);
            promise.finally(() => inProgress.delete(promise));
        }
        
        if (inProgress.size > 0) {
            await Promise.race(inProgress);
        }
    }
    
    return results;
}

await Actor.main(async () => {
    const input = await Actor.getInput<Input>();
    
    if (!input) {
        throw new Error('Input is missing. Provide at least an "emails" array.');
    }
    
    const {
        emails = [],
        backendUrl = process.env.BACKEND_URL || 'http://localhost:8080',
        proxy,
        concurrency = 5,
        retryCount = 2,
        timeout = 30,
    } = input;
    
    // Validate inputs
    if (!Array.isArray(emails) || emails.length === 0) {
        throw new Error('The "emails" field must be a non-empty array of email strings.');
    }
    
    if (concurrency < 1 || concurrency > 50) {
        throw new Error('Concurrency must be between 1 and 50.');
    }
    
    if (retryCount < 0 || retryCount > 5) {
        throw new Error('Retry count must be between 0 and 5.');
    }
    
    if (timeout < 5 || timeout > 300) {
        throw new Error('Timeout must be between 5 and 300 seconds.');
    }
    
    log.info(`Starting verification of ${emails.length} email(s) using backend "${backendUrl}"`);
    log.info(`Configuration: concurrency=${concurrency}, retryCount=${retryCount}, timeout=${timeout}s`);
    
    // Check backend health
    const isHealthy = await checkBackendHealth(backendUrl);
    if (!isHealthy) {
        throw new Error(
            `Backend at "${backendUrl}" is not responding. Please ensure the backend is running and accessible.`,
        );
    }
    
    // Filter and clean emails
    const cleanEmails = emails
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
    
    if (cleanEmails.length === 0) {
        throw new Error('No valid emails found after filtering.');
    }
    
    log.info(`Processing ${cleanEmails.length} valid email(s)...`);
    
    // Process emails
    const results = await processEmailsBatch(
        cleanEmails,
        backendUrl,
        proxy,
        concurrency,
        retryCount,
        timeout,
    );
    
    // Generate summary
    const summary = {
        total: results.length,
        successful: results.filter((r) => r.result).length,
        failed: results.filter((r) => r.error).length,
        reachable: results.filter((r) => r.result?.is_reachable === 'safe').length,
        invalid: results.filter((r) => r.result?.is_reachable === 'invalid').length,
        risky: results.filter((r) => r.result?.is_reachable === 'risky').length,
        unknown: results.filter((r) => r.result?.is_reachable === 'unknown').length,
    };
    
    await Actor.setValue('SUMMARY', summary);
    
    log.info('Verification completed!');
    log.info(`Total: ${summary.total}`);
    log.info(`Successful: ${summary.successful} | Failed: ${summary.failed}`);
    log.info(`Reachable: ${summary.reachable} | Invalid: ${summary.invalid} | Risky: ${summary.risky} | Unknown: ${summary.unknown}`);
});
