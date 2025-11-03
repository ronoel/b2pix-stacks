use std::sync::Arc;

use crate::services::trello::trello_card_service::TrelloConfig;

/// Service responsible for registering Trello-related event handlers
pub struct TrelloService;

impl TrelloService {
    pub fn new() -> Self {
        Self
    }

    /// Register all Trello-related event handlers
    pub fn register_handlers(
        &self,
        registry: &crate::events::handlers::EventHandlerRegistry,
        config: TrelloConfig,
    ) {
        // Register all Trello-related handlers
        registry.register(Arc::new(
            crate::services::trello::PaymentRequestCreatedTrelloHandler::new(config)
        ));
        // Future Trello handlers can be registered here:
        // registry.register(Arc::new(BuyCreatedTrelloHandler::new(config.clone())));
        // registry.register(Arc::new(DisputeOpenedTrelloHandler::new(config.clone())));
    }
}
