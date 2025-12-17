import { verifyEmail as verifyEmailNative } from './check_if_email_exists_node.node';

export interface ProxyConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
}

export interface CheckEmailRequest {
    to_email: string;
    from_email?: string;
    hello_name?: string;
    proxy?: ProxyConfig;
}

export async function verifyEmail(request: CheckEmailRequest): Promise<string> {
    return verifyEmailNative(request);
}

