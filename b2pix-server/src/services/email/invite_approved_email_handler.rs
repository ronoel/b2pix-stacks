use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::events::{
    handlers::{EventHandler, EventHandlerError},
};

// Invite Approval Event Handler
#[derive(Clone)]
pub struct InviteApprovedEmailHandler {
    email_service: Arc<crate::services::email::EmailService>,
}

impl InviteApprovedEmailHandler {
    pub fn new(email_service: Arc<crate::services::email::EmailService>) -> Self {
        Self { email_service }
    }
}

#[async_trait]
impl EventHandler for InviteApprovedEmailHandler {
    fn can_handle(&self, event_type: &str) -> bool {
        event_type == "InviteApproved"
    }

    async fn handle(&self, event: &crate::events::store::StoredEvent) -> Result<(), EventHandlerError> {
        #[derive(Deserialize)]
        struct InviteApprovedEvent {
            invite_id: String,
            address: String,
            username: String,
            email: String,
            status: String,
        }

        let invite_event: InviteApprovedEvent = serde_json::from_value(event.event_data.clone())?;

        #[derive(Serialize)]
        struct InviteApprovedEmailParams {
            #[serde(rename = "USERNAME")]
            username: String,
            #[serde(rename = "ADDRESS")]
            address: String,
            #[serde(rename = "RECIPIENT_EMAIL")]
            recipient_email: String,
        }

        let params = InviteApprovedEmailParams {
            username: invite_event.username.clone(),
            address: invite_event.address,
            recipient_email: invite_event.email.clone(),
        };

        let recipient = crate::services::email::Recipient {
            email: invite_event.email.clone(),
            name: Some(invite_event.username.clone()),
        };

        self.email_service
            .send_transactional_email(
                crate::services::email::TemplateId::InviteApproved,
                &params,
                &[recipient],
            )
            .await
            .map_err(|e| {
                tracing::error!(
                    event_id = %event.id,
                    invite_id = %invite_event.invite_id,
                    error = %e,
                    "Failed to send invite approval email"
                );
                EventHandlerError::ExternalService(e.to_string())
            })?;

        Ok(())
    }

    fn name(&self) -> &'static str {
        "InviteApprovedEmailHandler"
    }
} 