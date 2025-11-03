use std::sync::Arc;

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
    ) {
        // Register all Trello-related handlers
        registry.register(Arc::new(
            crate::services::trello::PaymentRequestCreatedTrelloHandler::new()
        ));
        // Future Trello handlers can be registered here:
        // registry.register(Arc::new(BuyCreatedTrelloHandler::new()));
        // registry.register(Arc::new(DisputeOpenedTrelloHandler::new()));
    }
}
