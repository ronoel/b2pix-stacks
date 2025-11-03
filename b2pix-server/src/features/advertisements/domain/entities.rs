use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use crate::common::errors::AdvertisementError;

// Custom serialization/deserialization for u128 as i64 for MongoDB compatibility
mod u128_as_i64 {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<S>(value: &u128, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let i64_value = i64::try_from(*value)
            .map_err(|_| serde::ser::Error::custom("Value too large for i64"))?;
        i64_value.serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<u128, D::Error>
    where
        D: Deserializer<'de>,
    {
        let i64_value = i64::deserialize(deserializer)?;
        if i64_value < 0 {
            return Err(serde::de::Error::custom("Negative values not allowed"));
        }
        Ok(i64_value as u128)
    }
}

// Custom serialization/deserialization for DateTime fields using native MongoDB DateTime
mod bson_datetime_to_chrono {
    use serde::{self, Deserialize, Deserializer, Serialize, Serializer};
    use mongodb::bson::{DateTime as BsonDateTime};
    use chrono::{DateTime, Utc};

    pub fn serialize<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let timestamp_millis = date.timestamp_millis();
        let bson_dt = BsonDateTime::from_millis(timestamp_millis);
        bson_dt.serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let bson_dt = BsonDateTime::deserialize(deserializer)?;
        let timestamp_millis = bson_dt.timestamp_millis();
        DateTime::from_timestamp_millis(timestamp_millis)
            .ok_or_else(|| serde::de::Error::custom("Invalid timestamp"))
    }
}

/// Unique identifier for an advertisement
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AdvertisementId(ObjectId);

impl AdvertisementId {
    pub fn new() -> Self {
        Self(ObjectId::new())
    }

    pub fn from_object_id(id: ObjectId) -> Self {
        Self(id)
    }

    pub fn from_string(id_str: String) -> Self {
        let object_id = ObjectId::parse_str(&id_str)
            .expect("Invalid ObjectId string");
        Self(object_id)
    }

    pub fn as_object_id(&self) -> &ObjectId {
        &self.0
    }

    pub fn into_object_id(self) -> ObjectId {
        self.0
    }
}

impl std::fmt::Display for AdvertisementId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Advertisement status enumeration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AdvertisementStatus {
    /// Advertisement created, not yet validated or funded
    Draft,
    /// Advertisement waiting the transaction confirmation
    Pending,
    /// Advertisement validated and with funds available
    Ready,
    /// Processing a recharge deposit (locked state)
    ProcessingDeposit,
    /// Advertisement is being closed, no new purchases allowed
    Finishing,
    /// Failed to validate bank account or PIX key for receiving
    BankFailed,
    /// Failed to receive the expected deposit/funding
    DepositFailed,
    /// Advertisement closed (manually or by fund exhaustion)
    Closed,
    /// Advertisement paused by user action or moderation
    Disabled,
}

// impl std::fmt::Display for AdvertisementStatus {
//     fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
//         let status_str = match self {
//             AdvertisementStatus::Draft => "draft",
//             AdvertisementStatus::Pending => "pending",
//             AdvertisementStatus::Ready => "ready",
//             AdvertisementStatus::BankFailed => "bank_failed",
//             AdvertisementStatus::DepositFailed => "deposit_failed",
//             AdvertisementStatus::Closed => "closed",
//             AdvertisementStatus::Disabled => "disabled",
//         };
//         write!(f, "{}", status_str)
//     }
// }

impl AdvertisementStatus {
    /// Check if status can transition to the target status
    pub fn can_transition_to(&self, target: &AdvertisementStatus) -> bool {
        use AdvertisementStatus::*;
        
        match (self, target) {
            // From Draft
            (Draft, Pending) => true,
            (Draft, BankFailed) => true,
            (Draft, DepositFailed) => true,
            (Draft, Disabled) => true,
            (Draft, Closed) => true,

            // From Ready
            (Ready, Disabled) => true,
            (Ready, Finishing) => true,
            (Ready, ProcessingDeposit) => true,  // Allow recharge deposits
            (Ready, BankFailed) => true,
            (Ready, DepositFailed) => true,

            // From ProcessingDeposit - can return to Ready or fail
            (ProcessingDeposit, Ready) => true,
            (ProcessingDeposit, DepositFailed) => true,

            // From Finishing - only allow close when no active purchases
            (Finishing, Closed) => true,

            // From Pending
            (Pending, Ready) => true,
            (Pending, BankFailed) => true,
            (Pending, DepositFailed) => true,
            (Pending, Disabled) => true,
            (Pending, Closed) => true,

            // From BankFailed
            (BankFailed, Ready) => true,
            (BankFailed, DepositFailed) => true,
            (BankFailed, Disabled) => true,
            (BankFailed, Closed) => true,

            // From DepositFailed
            (DepositFailed, Ready) => true,
            (DepositFailed, BankFailed) => true,
            (DepositFailed, Disabled) => true,
            (DepositFailed, Closed) => true,

            // From Disabled
            (Disabled, Ready) => true,
            (Disabled, Closed) => true,
            (Disabled, BankFailed) => true,
            (Disabled, DepositFailed) => true,

            // From Closed - no transitions allowed
            (Closed, _) => false,

            // Same status
            (a, b) if a == b => true,

            // All other transitions are invalid
            _ => false,
        }
    }
}

/// Represents a cryptocurrency sale advertisement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Advertisement {
    #[serde(rename = "_id")]
    pub id: AdvertisementId,
    /// Seller's receiving address (e.g., bc1...)
    pub seller_address: String,
    /// Token symbol (e.g., "BTC", "ETH")
    pub token: String,
    /// Fiat currency (e.g., "BRL", "USD")
    pub currency: String,
    /// Price per token unit (in cents)
    #[serde(with = "u128_as_i64")]
    pub price: u128,
    /// Total amount of tokens deposited (sum of all confirmed deposits)
    #[serde(with = "u128_as_i64")]
    pub total_deposited: u128,
    /// Amount currently available for sale
    #[serde(with = "u128_as_i64")]
    pub available_amount: u128,
    /// Minimum amount accepted for payment (in cents)
    pub min_amount: i64,
    /// Maximum amount accepted for payment (in cents)
    pub max_amount: i64,
    /// Advertisement status
    pub status: AdvertisementStatus,
    /// Flag indicating if the advertisement is active
    pub is_active: bool,
    /// PIX key for payment processing
    pub pix_key: String,
    /// Creation timestamp
    #[serde(with = "bson_datetime_to_chrono")]
    pub created_at: DateTime<Utc>,
    /// Last update timestamp
    #[serde(with = "bson_datetime_to_chrono")]
    pub updated_at: DateTime<Utc>,
}

impl Advertisement {
    /// Create a new advertisement in draft status
    pub fn new(
        seller_address: String,
        token: String,
        currency: String,
        price: u128,
        pix_key: String,
        min_amount: i64,
        max_amount: i64,
    ) -> Result<Self, AdvertisementError> {
        if price == 0 {
            return Err(AdvertisementError::InvalidPrice);
        }

        if min_amount <= 0 {
            return Err(AdvertisementError::InvalidMinAmount);
        }

        if max_amount <= 0 {
            return Err(AdvertisementError::InvalidMaxAmount);
        }

        if max_amount < min_amount {
            return Err(AdvertisementError::InvalidAmountRange);
        }

        let now = Utc::now();

        Ok(Self {
            id: AdvertisementId::new(),
            seller_address,
            token,
            currency,
            price,
            total_deposited: 0, // Will be updated when deposits are confirmed
            available_amount: 0, // Will be updated when deposits are confirmed
            min_amount,
            max_amount,
            status: AdvertisementStatus::Draft,
            is_active: true, // Draft status is active
            pix_key,
            created_at: now,
            updated_at: now,
        })
    }

    /// Change advertisement status
    pub fn change_status(&mut self, new_status: AdvertisementStatus) -> Result<(), AdvertisementError> {
        if !self.status.can_transition_to(&new_status) {
            return Err(AdvertisementError::InvalidStatusTransition);
        }
        
        self.status = new_status;

        // Update is_active field based on the status
        self.is_active = match self.status {
            AdvertisementStatus::Draft
            | AdvertisementStatus::Ready
            | AdvertisementStatus::Pending
            | AdvertisementStatus::ProcessingDeposit => true,
            _ => false,
        };

        self.updated_at = Utc::now();
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_advertisement_new_with_valid_amounts() {
        let result = Advertisement::new(
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh".to_string(),
            "BTC".to_string(),
            "BRL".to_string(),
            100_000, // price: 1000.00 BRL
            "user@example.com".to_string(),
            10_000, // min_amount: 100.00 BRL
            50_000, // max_amount: 500.00 BRL
        );

        assert!(result.is_ok());
        let advertisement = result.unwrap();
        assert_eq!(advertisement.min_amount, 10_000);
        assert_eq!(advertisement.max_amount, 50_000);
        assert_eq!(advertisement.total_deposited, 0);
        assert_eq!(advertisement.available_amount, 0);
        assert_eq!(advertisement.status, AdvertisementStatus::Draft);
        assert!(advertisement.is_active);
    }

    #[test]
    fn test_advertisement_new_with_negative_min_amount() {
        let result = Advertisement::new(
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh".to_string(),
            "BTC".to_string(),
            "BRL".to_string(),
            100_000,
            "user@example.com".to_string(),
            -1, // negative min_amount
            50_000,
        );

        assert!(matches!(result, Err(AdvertisementError::InvalidMinAmount)));
    }

    #[test]
    fn test_advertisement_new_with_zero_min_amount() {
        let result = Advertisement::new(
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh".to_string(),
            "BTC".to_string(),
            "BRL".to_string(),
            100_000,
            "user@example.com".to_string(),
            0, // zero min_amount
            50_000,
        );

        assert!(matches!(result, Err(AdvertisementError::InvalidMinAmount)));
    }

    #[test]
    fn test_advertisement_new_with_negative_max_amount() {
        let result = Advertisement::new(
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh".to_string(),
            "BTC".to_string(),
            "BRL".to_string(),
            100_000,
            "user@example.com".to_string(),
            10_000,
            -1, // negative max_amount
        );

        assert!(matches!(result, Err(AdvertisementError::InvalidMaxAmount)));
    }

    #[test]
    fn test_advertisement_new_with_zero_max_amount() {
        let result = Advertisement::new(
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh".to_string(),
            "BTC".to_string(),
            "BRL".to_string(),
            100_000,
            "user@example.com".to_string(),
            10_000,
            0, // zero max_amount
        );

        assert!(matches!(result, Err(AdvertisementError::InvalidMaxAmount)));
    }

    #[test]
    fn test_advertisement_new_with_max_less_than_min() {
        let result = Advertisement::new(
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh".to_string(),
            "BTC".to_string(),
            "BRL".to_string(),
            100_000,
            "user@example.com".to_string(),
            50_000, // min_amount: 500.00 BRL
            10_000, // max_amount: 100.00 BRL (less than min)
        );

        assert!(matches!(result, Err(AdvertisementError::InvalidAmountRange)));
    }

    #[test]
    fn test_advertisement_new_with_equal_min_max() {
        let result = Advertisement::new(
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh".to_string(),
            "BTC".to_string(),
            "BRL".to_string(),
            100_000,
            "user@example.com".to_string(),
            30_000, // min_amount: 300.00 BRL
            30_000, // max_amount: 300.00 BRL (equal to min)
        );

        assert!(result.is_ok());
        let advertisement = result.unwrap();
        assert_eq!(advertisement.min_amount, 30_000);
        assert_eq!(advertisement.max_amount, 30_000);
    }
}
