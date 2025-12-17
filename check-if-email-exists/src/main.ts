import { Actor, log } from 'apify';

interface ProxyConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
}

interface Input {
    emails: string[];
    backendUrl: string;
    proxy?: ProxyConfig;
}

interface CheckIfEmailExistsResult {
    input: string;
    is_reachable: string;
    misc?: Record<string, unknown>;
    mx?: Record<string, unknown>;
    smtp?: Record<string, unknown>;
    syntax?: Record<string, unknown>;
    // Allow any additional fields that the backend might return
    [key: string]: unknown;
}

await Actor.main(async () => {
    const input = await Actor.getInput<Input>();

    if (!input) {
        throw new Error('Input is missing. Provide "backendUrl" and a non-empty "emails" array.');
    }

    const { emails, backendUrl, proxy } = input;

    if (!backendUrl) {
        throw new Error('The "backendUrl" field is required in the input.');
    }

    if (!Array.isArray(emails) || emails.length === 0) {
        throw new Error('The "emails" field must be a non-empty array of email strings.');
    }

    log.info(`Starting verification of ${emails.length} email(s) using backend "${backendUrl}".`);

    const results: Array<{ email: string; result?: CheckIfEmailExistsResult; error?: string }> = [];

    for (const rawEmail of emails) {
        const email = rawEmail.trim();
        if (!email) continue;

        try {
            const url = new URL('/v0/check_email', backendUrl).toString();

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to_email: email,
                    ...(proxy ? { proxy } : {}),
                }),
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(
                    `Backend responded with status ${response.status} ${response.statusText} for "${email}": ${text}`,
                );
            }

            const result = (await response.json()) as CheckIfEmailExistsResult;

            const item = {
                email,
                ...result,
            };

            results.push({ email, result });
            await Actor.pushData(item);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const message = err.message;

            log.exception(err, `Failed to verify email "${email}".`);

            const errorItem = {
                email,
                error: message,
            };

            results.push({ email, error: message });
            await Actor.pushData(errorItem);
        }
    }

    const summary = {
        total: results.length,
        successful: results.filter((r) => r.result).length,
        failed: results.filter((r) => r.error).length,
    };

    await Actor.setValue('SUMMARY', summary);

    log.info(
        `Finished verification. Total: ${summary.total}, successful: ${summary.successful}, failed: ${summary.failed}.`,
    );
});
