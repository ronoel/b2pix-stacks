use serde::Serialize;
use std::collections::HashMap;
use std::error::Error;
use std::sync::Arc;
use tokio::fs;
use aws_sdk_sesv2::{Client as SesClient, types::{Content, Body, Message, Destination, EmailContent}};

use crate::config::Config;
use crate::events::handlers::EventHandlerRegistry;
use crate::services::email::invite_sent_email_handler::InviteSentEmailHandler;
use crate::services::email::invite_request_email_handler::InviteRequestEmailHandler;
use crate::services::email::invite_approved_email_handler::InviteApprovedEmailHandler;
use crate::services::email::PaymentBuyerSuccessEmailHandler;
use crate::services::email::PaymentSellerSuccessEmailHandler;

#[derive(Debug, Clone)]
pub enum TemplateId {
    VerifyEmail,
    RequestInviteCode,
    InviteApproved,
    InviteCode,
    PaymentBuyerSuccess,
    PaymentSellerSuccess,
}

impl TemplateId {
    fn template_name(&self) -> &'static str {
        match self {
            TemplateId::VerifyEmail => "verify_email",
            TemplateId::RequestInviteCode => "request_invite_code",
            TemplateId::InviteApproved => "invite_approved",
            TemplateId::InviteCode => "invite_code",
            TemplateId::PaymentBuyerSuccess => "payment_buyer_success",
            TemplateId::PaymentSellerSuccess => "payment_seller_success",
        }
    }
    
    fn template_path(&self) -> String {
        format!("templates/{}.html", self.template_name())
    }
}

/// A single recipient of the email.
#[derive(Debug, Clone, Serialize)]
pub struct Recipient {
    pub email: String,
    pub name: Option<String>,
}


/// Represents an email template with placeholders
pub struct EmailTemplate {
    pub subject: String,
    pub html_content: String,
    pub text_content: String,
}

pub struct EmailService {
    ses_client: SesClient,
    from_email: String,
    from_name: String,
    config: Arc<Config>,
}

impl EmailService {
    pub async fn new(config: Arc<Config>) -> Self {
        // Load AWS configuration
        let aws_config = aws_config::defaults(aws_config::BehaviorVersion::latest())
            .region(aws_config::Region::new(config.aws_region.clone()))
            .load()
            .await;

        let ses_client = SesClient::new(&aws_config);

        Self {
            ses_client,
            from_email: config.from_email.clone(),
            from_name: config.from_name.clone(),
            config,
        }
    }

    pub fn register_handlers(
        self: Arc<Self>,
        registry: &EventHandlerRegistry,
        buy_repository: Arc<dyn crate::features::buys::ports::repositories::BuyRepository>,
        advertisement_repository: Arc<dyn crate::features::advertisements::ports::repositories::AdvertisementRepository>,
        invite_repository: Arc<dyn crate::features::invites::ports::InviteRepository>,
    ) {
        // Register email event handlers using the new typed approach
        let invite_sent_handler = InviteSentEmailHandler::new(Arc::clone(&self));
        registry.register(invite_sent_handler.into_event_handler());

        // let invite_request_handler = InviteRequestEmailHandler::new(Arc::clone(&self));
        // registry.register(Arc::new(invite_request_handler));

        // let invite_approved_handler = InviteApprovedEmailHandler::new(Arc::clone(&self));
        // registry.register(Arc::new(invite_approved_handler));

        // Register buyer success email handler
        let payment_buyer_success_handler = PaymentBuyerSuccessEmailHandler::new(
            Arc::clone(&self),
            Arc::clone(&buy_repository),
            Arc::clone(&invite_repository),
        );
        registry.register(payment_buyer_success_handler.into_event_handler());

        // Register seller success email handler
        let payment_seller_success_handler = PaymentSellerSuccessEmailHandler::new(
            Arc::clone(&self),
            buy_repository,
            advertisement_repository,
            invite_repository,
        );
        registry.register(payment_seller_success_handler.into_event_handler());
    }

    /// Loads and processes HTML template with parameters
    async fn load_template<P: Serialize>(&self, template_id: TemplateId, params: &P) -> Result<EmailTemplate, Box<dyn Error + Send + Sync>> {
        let template_path = template_id.template_path();
        let html_content = fs::read_to_string(&template_path).await
            .map_err(|e| format!("Failed to read template {}: {}", template_path, e))?;
        
        // Replace placeholders in HTML content
        let processed_html = self.replace_placeholders(&html_content, params)?;
        
        // Generate subject based on template type
        let subject = match template_id {
            TemplateId::VerifyEmail => "Confirme seu email - B2PIX",
            TemplateId::RequestInviteCode => "Recebemos sua solicitação de convite - B2PIX",
            TemplateId::InviteApproved => "Seu convite foi aprovado - B2PIX",
            TemplateId::InviteCode => "Seu código de acesso à B2PIX",
            TemplateId::PaymentBuyerSuccess => "Confirmação de compra - B2PIX",
            TemplateId::PaymentSellerSuccess => "Confirmação de venda - B2PIX",
        };

        Ok(EmailTemplate {
            subject: subject.to_string(),
            html_content: processed_html.clone(),
            text_content: String::new(), // Plain text version can be added later if needed
        })
    }

    /// Replace placeholders in template with actual values
    fn replace_placeholders<P: Serialize>(&self, template: &str, params: &P) -> Result<String, Box<dyn Error + Send + Sync>> {
        let params_map: HashMap<String, serde_json::Value> = match serde_json::to_value(params)? {
            serde_json::Value::Object(map) => map.into_iter().collect(),
            _ => return Err("Parameters must be an object".into()),
        };

        let mut result = template.to_string();
        for (key, value) in params_map {
            let placeholder = format!("{{{{{}}}}}", key.to_uppercase());
            let replacement = match value {
                serde_json::Value::String(s) => s,
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => b.to_string(),
                _ => continue,
            };
            result = result.replace(&placeholder, &replacement);
        }

        Ok(result)
    }


    /// Sends a transactional email via AWS SES using HTML templates.
    ///
    /// - `template_id`: the template to use from the templates directory.
    /// - `params`: a serializable map/object of the dynamic parameters your template expects.
    /// - `to`: slice of `Recipient` with at least one entry.
    ///
    /// Returns the message ID on success.
    pub async fn send_transactional_email<P: Serialize>(
        &self,
        template_id: TemplateId,
        params: &P,
        to: &[Recipient],
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let template = self.load_template(template_id, params).await?;

        // Convert Recipients to email addresses for SES
        let to_addresses: Vec<String> = to.iter().map(|recipient| {
            if let Some(name) = &recipient.name {
                format!("{} <{}>", name, recipient.email)
            } else {
                recipient.email.clone()
            }
        }).collect();

        // Create the SES message using the SDK types
        let subject = Content::builder()
            .data(&template.subject)
            .charset("UTF-8")
            .build()
            .map_err(|e| format!("Failed to build subject: {}", e))?;

        let html_body = Content::builder()
            .data(&template.html_content)
            .charset("UTF-8")
            .build()
            .map_err(|e| format!("Failed to build HTML body: {}", e))?;

        let body = Body::builder()
            .html(html_body)
            .build();

        let message = Message::builder()
            .subject(subject)
            .body(body)
            .build();

        let destination = Destination::builder()
            .set_to_addresses(Some(to_addresses))
            .build();

        let source = if !self.from_name.is_empty() {
            format!("{} <{}>", self.from_name, self.from_email)
        } else {
            self.from_email.clone()
        };

        // Send the email using the SES client
        let response = self.ses_client
            .send_email()
            .from_email_address(&source)
            .destination(destination)
            .content(
                EmailContent::builder()
                    .simple(message)
                    .build()
            )
            .send()
            .await
            .map_err(|e| format!("Failed to send email via SES: {}", e))?;

        // Return the message ID
        Ok(response.message_id().unwrap_or("Email sent successfully").to_string())
    }
}
