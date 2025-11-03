use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BitcoinPriceResponse {
    /// Bitcoin price in BRL cents (e.g., 50000000 = R$ 500,000.00)
    pub price: u128
}
