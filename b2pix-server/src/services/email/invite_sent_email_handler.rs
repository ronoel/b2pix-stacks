use async_trait::async_trait;
use serde::Serialize;
use std::sync::Arc;

use crate::events::typed_handler::{TypedEventHandler, GenericEventHandler};
use crate::events::handlers::{EventHandler, EventHandlerError};
use crate::features::invites::domain::events::InviteSentEvent;

pub struct InviteSentEmailHandler {
    email_service: Arc<crate::services::email::EmailService>,
}

impl InviteSentEmailHandler {
    pub fn new(email_service: Arc<crate::services::email::EmailService>) -> Self {
        Self { email_service }
    }
    
    pub fn into_event_handler(self) -> Arc<dyn EventHandler> {
        Arc::new(GenericEventHandler::new(self))
    }
}

#[async_trait]
impl TypedEventHandler<InviteSentEvent> for InviteSentEmailHandler {
    async fn handle_typed(&self, event: &InviteSentEvent) -> Result<(), EventHandlerError> {
        #[derive(Serialize)]
        struct InviteEmailParams {
            #[serde(rename = "CODE")]
            code: String,
            #[serde(rename = "RECIPIENT_EMAIL")]
            recipient_email: String,
        }

        let params = InviteEmailParams {
            code: event.code.as_str().to_string(),
            recipient_email: event.email.as_str().to_string(),
        };

        let recipient = crate::services::email::Recipient {
            email: event.email.as_str().to_string(),
            name: None,
        };

        self.email_service
            .send_transactional_email(
                crate::services::email::TemplateId::InviteCode,
                &params,
                &[recipient],
            )
            .await
            .map_err(|e| {
                tracing::error!(
                    invite_id = %event.invite_id,
                    email = %event.email.as_str(),
                    error = %e,
                    "Failed to send invite email"
                );
                EventHandlerError::ExternalService(e.to_string())
            })?;

        Ok(())
    }
    
    fn handler_name(&self) -> &'static str {
        "InviteSentEmailHandler"
    }
}
