use check_if_email_exists::{
    check_email, CheckEmailInputBuilder, CheckEmailInputProxy,
};
use check_if_email_exists::smtp::verif_method::VerifMethod;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Deserialize, Serialize)]
#[napi(object)]
pub struct ProxyConfig {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[napi(object)]
pub struct CheckEmailRequest {
    pub to_email: String,
    pub from_email: Option<String>,
    pub hello_name: Option<String>,
    pub proxy: Option<ProxyConfig>,
}

#[napi]
pub async fn verify_email(request: CheckEmailRequest) -> Result<String> {
    // Convert proxy config to CheckEmailInputProxy if provided
    let proxy = request.proxy.map(|p| CheckEmailInputProxy {
        host: p.host,
        port: p.port,
        username: p.username,
        password: p.password,
        timeout_ms: None,
    });

    // Get default values or use provided ones
    let hello_name = request.hello_name.unwrap_or_else(|| "gmail.com".to_string());
    let from_email = request.from_email.unwrap_or_else(|| "reacher@gmail.com".to_string());
    let smtp_port = 25;
    let smtp_timeout = None::<Duration>;
    let retries = 1;

    // Create VerifMethod with same config for all providers
    let verif_method = VerifMethod::new_with_same_config_for_all(
        proxy,
        hello_name,
        from_email,
        smtp_port,
        smtp_timeout,
        retries,
    );

    // Build the input
    let input = CheckEmailInputBuilder::default()
        .to_email(request.to_email.clone())
        .verif_method(verif_method)
        .build()
        .map_err(|e| {
            Error::new(
                Status::InvalidArg,
                format!("Failed to build CheckEmailInput: {}", e),
            )
        })?;

    // Verify the email
    let result = check_email(&input).await;

    // Serialize and return the result
    serde_json::to_string(&result).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to serialize result: {}", e),
        )
    })
}

