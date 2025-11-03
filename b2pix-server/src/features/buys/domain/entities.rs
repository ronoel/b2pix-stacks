use crate::common::errors::BuyError;
use crate::features::advertisements::domain::entities::AdvertisementId;
use crate::features::shared::value_objects::CryptoAddress;
use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

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

/// Unique identifier for a buy
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BuyId(ObjectId);

impl BuyId {
    pub fn new() -> Self {
        Self(ObjectId::new())
    }

    pub fn from_object_id(id: ObjectId) -> Self {
        Self(id)
    }

    pub fn from_string(id_str: String) -> Result<Self, mongodb::bson::oid::Error> {
        let object_id = ObjectId::parse_str(&id_str)?;
        Ok(Self(object_id))
    }

    pub fn as_object_id(&self) -> &ObjectId {
        &self.0
    }

    pub fn into_object_id(self) -> ObjectId {
        self.0
    }
}

impl std::fmt::Display for BuyId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Buy status enumeration for P2P transactions
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BuyStatus {
    /// Buy created, waiting for payment
    Pending,
    /// Payment received, waiting for crypto transfer
    Paid,
    /// Payment confirmed, waiting for crypto transfer
    PaymentConfirmed,
    /// Crypto transfer completed successfully
    // Completed,
    // /// Buy cancelled by buyer or seller
    Cancelled,
    /// Buy expired without payment
    Expired,
    /// Dispute opened, waiting for moderator intervention
    InDispute,
    /// Dispute in favor of buyer (temporary state before payment confirmation)
    DisputeFavorBuyer,
    /// Dispute resolved in favor of buyer (refund)
    DisputeResolvedBuyer,
    /// Dispute in favor of seller (temporary state before crypto release)
    DisputeFavorSeller,
    /// Dispute resolved in favor of seller (crypto released)
    DisputeResolvedSeller,
}

impl BuyStatus {
    /// Check if status can transition to the target status
    pub fn can_transition_to(&self, target: &BuyStatus) -> bool {
        use BuyStatus::*;

        match (self, target) {
            // From Pending
            (Pending, Paid) => true,
            (Pending, Cancelled) => true,
            (Pending, Expired) => true,
            (Pending, InDispute) => true,

            // From Paid
            (Paid, Completed) => true,
            (Paid, Cancelled) => true, // Refund scenario
            (Paid, InDispute) => true,
            (Paid, PaymentConfirmed) => true,

            // From PaymentConfirmed
            (PaymentConfirmed, Completed) => true,

            // From InDispute
            (InDispute, DisputeFavorBuyer) => true,
            (InDispute, DisputeFavorSeller) => true,
            (InDispute, DisputeResolvedSeller) => true,
            (InDispute, Cancelled) => true, // Moderator can cancel

            // From DisputeFavorBuyer
            (DisputeFavorBuyer, DisputeResolvedBuyer) => true,

            // From DisputeFavorSeller
            (DisputeFavorSeller, DisputeResolvedSeller) => true,

            // From final states - no transitions allowed
            (Completed, _) => false,
            (Cancelled, _) => false,
            (Expired, _) => false,
            (DisputeResolvedBuyer, _) => false,
            (DisputeResolvedSeller, _) => false,

            // Same status
            (a, b) if a == b => true,

            // All other transitions are invalid
            _ => false,
        }
    }

    /// Check if the buy is in a final state
    pub fn is_final(&self) -> bool {
        matches!(
            self,
            // BuyStatus::Completed
                // | 
                BuyStatus::Cancelled
                | BuyStatus::Expired
                | BuyStatus::PaymentConfirmed
                | BuyStatus::DisputeResolvedBuyer
                | BuyStatus::DisputeResolvedSeller
        )
    }

    /// Check if the buy can be paid
    pub fn can_be_paid(&self) -> bool {
        matches!(self, BuyStatus::Pending)
    }

    /// Check if the buy is in dispute process
    pub fn is_in_dispute(&self) -> bool {
        matches!(
            self,
            BuyStatus::InDispute
                | BuyStatus::DisputeResolvedBuyer
                | BuyStatus::DisputeResolvedSeller
        )
    }

    /// Check if dispute can be opened
    pub fn can_open_dispute(&self) -> bool {
        matches!(self, BuyStatus::Paid)
    }
}

/// Represents a partial buy/purchase transaction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Buy {
    #[serde(rename = "_id")]
    pub id: BuyId,
    /// Reference to the original advertisement
    pub advertisement_id: AdvertisementId,
    /// Amount of token in minimal units (e.g., satoshis)
    #[serde(with = "u128_as_i64")]
    pub amount: u128,
    /// Price per token (in cents)
    #[serde(with = "u128_as_i64")]
    pub price: u128,
    /// Platform fee (in cents)
    #[serde(with = "u128_as_i64")]
    pub fee: u128,
    /// Total value that the user will pay for this buy (in cents)
    #[serde(with = "u128_as_i64")]
    pub pay_value: u128,
    /// Buyer's receiving address
    pub address_buy: CryptoAddress,
    /// PIX key for payment
    pub pix_key: String,
    /// Optional PIX transaction ID
    pub pix_id: Option<String>,
    /// Buy status
    pub status: BuyStatus,
    /// Flag indicating if the buy is in a final state
    pub is_final: bool,
    /// Number of times PIX verification has been attempted (max 3)
    #[serde(default)]
    pub pix_verification_attempts: u8,
    /// Automatic expiration timestamp
    #[serde(with = "bson_datetime_to_chrono")]
    pub expires_at: DateTime<Utc>,
    /// Creation timestamp
    #[serde(with = "bson_datetime_to_chrono")]
    pub created_at: DateTime<Utc>,
    /// Last update timestamp
    #[serde(with = "bson_datetime_to_chrono")]
    pub updated_at: DateTime<Utc>,
}

impl Buy {
    /// Create a new buy in pending status
    pub fn new(
        advertisement_id: AdvertisementId,
        amount: u128,
        price: u128,
        fee: u128,
        pay_value: u128,
        address_buy: CryptoAddress,
        pix_key: String,
    ) -> Result<Self, BuyError> {
        if amount == 0 {
            return Err(BuyError::InvalidAmount);
        }

        if price == 0 {
            return Err(BuyError::InvalidPrice);
        }

        let now = Utc::now();
        let expires_at = now + chrono::Duration::minutes(15);

        Ok(Self {
            id: BuyId::new(),
            advertisement_id,
            amount,
            price,
            fee,
            pay_value,
            address_buy,
            pix_key,
            pix_id: None,
            status: BuyStatus::Pending,
            is_final: false, // Pending status is not final
            pix_verification_attempts: 0,
            expires_at,
            created_at: now,
            updated_at: now,
        })
    }

    // /// Change buy status
    // pub fn change_status(&mut self, new_status: BuyStatus) -> Result<(), BuyError> {
    //     if !self.status.can_transition_to(&new_status) {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     self.status = new_status;
    //     self.is_final = self.status.is_final();
    //     self.updated_at = Utc::now();
    //     Ok(())
    // }

    // /// Mark as paid and proceed to processing
    // pub fn mark_as_paid(&mut self) -> Result<(), BuyError> {
    //     if !self.status.can_be_paid() {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     if self.is_expired() {
    //         return Err(BuyError::Expired);
    //     }

    //     self.change_status(BuyStatus::Paid)
    // }

    // /// Complete the buy successfully
    // pub fn complete(&mut self) -> Result<(), BuyError> {
    //     if self.status != BuyStatus::Paid {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     self.change_status(BuyStatus::Completed)
    // }

    // /// Cancel the buy
    // pub fn cancel(&mut self) -> Result<(), BuyError> {
    //     if self.status.is_final() && self.status != BuyStatus::Paid {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     self.change_status(BuyStatus::Cancelled)
    // }

    // /// Expire the buy due to timeout
    // pub fn expire(&mut self) -> Result<(), BuyError> {
    //     if self.status != BuyStatus::Pending {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     self.change_status(BuyStatus::Expired)
    // }

    // /// Open a dispute for this buy
    // pub fn open_dispute(&mut self) -> Result<(), BuyError> {
    //     if !self.status.can_open_dispute() {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     self.change_status(BuyStatus::InDispute)
    // }

    // /// Resolve dispute in favor of buyer (refund)
    // pub fn resolve_dispute_for_buyer(&mut self) -> Result<(), BuyError> {
    //     if self.status != BuyStatus::InDispute {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     self.change_status(BuyStatus::DisputeResolvedBuyer)
    // }

    // /// Resolve dispute in favor of seller (release crypto)
    // pub fn resolve_dispute_for_seller(&mut self) -> Result<(), BuyError> {
    //     if self.status != BuyStatus::InDispute {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     self.change_status(BuyStatus::DisputeResolvedSeller)
    // }

    // / Check if the buy has expired
    // pub fn is_expired(&self) -> bool {
    //     Utc::now() > self.expires_at
    // }

    // /// Check if the buy is still active (not expired and not final)
    // pub fn is_active(&self) -> bool {
    //     !self.is_expired() && !self.status.is_final()
    // }

    // /// Calculate total fiat amount (price * amount + fee)
    // pub fn total_fiat_amount(&self) -> u128 {
    //     self.price * self.amount / 100_000_000 // Assuming satoshis
    // }

    // /// Calculate net fiat amount for seller (total - fee)
    // pub fn net_fiat_amount(&self) -> u128 {
    //     self.total_fiat_amount() - self.fee
    // }

    // /// Get remaining time until expiration
    // pub fn remaining_time(&self) -> chrono::Duration {
    //     if self.is_expired() {
    //         chrono::Duration::zero()
    //     } else {
    //         self.expires_at - Utc::now()
    //     }
    // }

    // /// Extend expiration time
    // pub fn extend_expiration(&mut self, additional_minutes: i64) -> Result<(), BuyError> {
    //     if self.status.is_final() {
    //         return Err(BuyError::InvalidStatusTransition);
    //     }

    //     self.expires_at = self.expires_at + chrono::Duration::minutes(additional_minutes);
    //     self.updated_at = Utc::now();
    //     Ok(())
    // }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::advertisements::domain::entities::AdvertisementId;

    fn create_test_buy() -> Buy {
        Buy::new(
            AdvertisementId::new(),
            25000000u128, // 0.25 BTC in satoshis
            5000000u128,  // 50,000 BRL in cents per BTC
            500u128,      // 5 BRL fee in cents
            1250500u128,  // 12,505 BRL pay value in cents
            CryptoAddress::from_string("bc1quser123address".to_string()),
            "user@example.com".to_string(),
        )
        .unwrap()
    }

    // #[test]
    // fn test_create_buy() {
    //     let buy = create_test_buy();

    //     assert_eq!(buy.status, BuyStatus::Pending);
    //     assert!(buy.expires_at > Utc::now());
    //     assert!(buy.is_active());
    //     assert!(!buy.is_expired());
    // }

    #[test]
    fn test_invalid_amount() {
        let result = Buy::new(
            AdvertisementId::new(),
            0u128, // Invalid amount
            5000000u128,
            500u128,
            1250500u128, // pay_value
            CryptoAddress::from_string("bc1quser123address".to_string()),
            "user@example.com".to_string(),
        );

        assert!(matches!(result, Err(BuyError::InvalidAmount)));
    }

    // #[test]
    // fn test_mark_as_paid() {
    //     let mut buy = create_test_buy();

    //     assert!(buy.mark_as_paid().is_ok());
    //     assert_eq!(buy.status, BuyStatus::Paid);
    // }

    // #[test]
    // fn test_complete_buy() {
    //     let mut buy = create_test_buy();

    //     buy.mark_as_paid().unwrap();
    //     assert!(buy.complete().is_ok());
    //     assert_eq!(buy.status, BuyStatus::Completed);
    // }

    // #[test]
    // fn test_cancel_buy() {
    //     let mut buy = create_test_buy();

    //     assert!(buy.cancel().is_ok());
    //     assert_eq!(buy.status, BuyStatus::Cancelled);
    // }

    // #[test]
    // fn test_expire_buy() {
    //     let mut buy = create_test_buy();

    //     assert!(buy.expire().is_ok());
    //     assert_eq!(buy.status, BuyStatus::Expired);
    // }

    // #[test]
    // fn test_status_transitions() {
    //     let mut buy = create_test_buy();

    //     // Pending -> Paid
    //     assert!(buy.change_status(BuyStatus::Paid).is_ok());

    //     // Paid -> Completed
    //     assert!(buy.change_status(BuyStatus::Completed).is_ok());

    //     // Completed -> anything (should fail)
    //     assert!(buy.change_status(BuyStatus::Cancelled).is_err());
    // }

    // #[test]
    // fn test_total_fiat_amount() {
    //     let buy = create_test_buy();

    //     // 0.25 BTC * 50,000 BRL = 12,500 BRL (in cents: 1,250,000) - fee is not included in total_fiat_amount
    //     let expected = 25000000u128 * 5000000u128 / 100_000_000u128;
    //     assert_eq!(buy.total_fiat_amount(), expected);
    // }

    #[test]
    fn test_pay_value() {
        let buy = create_test_buy();

        // The pay_value should be what the user actually pays (includes everything)
        assert_eq!(buy.pay_value, 1250500u128); // 12,505 BRL in cents
    }

    // #[test]
    // fn test_extend_expiration() {
    //     let mut buy = create_test_buy();
    //     let original_expiration = buy.expires_at;

    //     assert!(buy.extend_expiration(15).is_ok()); // Add 15 minutes

    //     assert!(buy.expires_at > original_expiration);
    //     let diff = buy.expires_at - original_expiration;
    //     assert_eq!(diff.num_minutes(), 15);
    // }

    // #[test]
    // fn test_extend_final_buy_fails() {
    //     let mut buy = create_test_buy();
    //     buy.mark_as_paid().unwrap();
    //     buy.complete().unwrap();

    //     assert!(buy.extend_expiration(15).is_err());
    // }

    // #[test]
    // fn test_dispute_workflow() {
    //     let mut buy = create_test_buy();

    //     // Mark as paid first
    //     buy.mark_as_paid().unwrap();
    //     assert_eq!(buy.status, BuyStatus::Paid);

    //     // Open dispute
    //     assert!(buy.open_dispute().is_ok());
    //     assert_eq!(buy.status, BuyStatus::InDispute);
    //     assert!(buy.status.is_in_dispute());

    //     // Cannot open dispute again
    //     assert!(buy.open_dispute().is_err());
    // }

    // #[test]
    // fn test_resolve_dispute_for_buyer() {
    //     let mut buy = create_test_buy();

    //     buy.mark_as_paid().unwrap();
    //     buy.open_dispute().unwrap();

    //     assert!(buy.resolve_dispute_for_buyer().is_ok());
    //     assert_eq!(buy.status, BuyStatus::DisputeResolvedBuyer);
    //     assert!(buy.status.is_final());
    //     assert!(buy.status.is_in_dispute());
    // }

    // #[test]
    // fn test_resolve_dispute_for_seller() {
    //     let mut buy = create_test_buy();

    //     buy.mark_as_paid().unwrap();
    //     buy.open_dispute().unwrap();

    //     assert!(buy.resolve_dispute_for_seller().is_ok());
    //     assert_eq!(buy.status, BuyStatus::DisputeResolvedSeller);
    //     assert!(buy.status.is_final());
    //     assert!(buy.status.is_in_dispute());
    // }

    // #[test]
    // fn test_cannot_open_dispute_from_pending() {
    //     let mut buy = create_test_buy();

    //     assert!(!buy.status.can_open_dispute());
    //     assert!(buy.open_dispute().is_err());
    // }

    // #[test]
    // fn test_cannot_resolve_dispute_without_opening() {
    //     let mut buy = create_test_buy();

    //     buy.mark_as_paid().unwrap();

    //     assert!(buy.resolve_dispute_for_buyer().is_err());
    //     assert!(buy.resolve_dispute_for_seller().is_err());
    // }

    // #[test]
    // fn test_dispute_status_transitions() {
    //     let mut buy = create_test_buy();

    //     // Pending -> Paid -> InDispute -> DisputeResolvedBuyer
    //     assert!(buy.change_status(BuyStatus::Paid).is_ok());
    //     assert!(buy.change_status(BuyStatus::InDispute).is_ok());
    //     assert!(buy.change_status(BuyStatus::DisputeResolvedBuyer).is_ok());

    //     // DisputeResolvedBuyer -> anything (should fail)
    //     assert!(buy.change_status(BuyStatus::Completed).is_err());
    //     assert!(buy.change_status(BuyStatus::InDispute).is_err());
    // }

    #[test]
    fn test_buy_id_from_string() {
        use mongodb::bson::oid::ObjectId;
        
        let object_id = ObjectId::new();
        let id_string = object_id.to_string();
        
        let buy_id = BuyId::from_string(id_string).unwrap();
        assert_eq!(buy_id.as_object_id(), &object_id);
        
        // Test invalid string
        let invalid_result = BuyId::from_string("invalid".to_string());
        assert!(invalid_result.is_err());
    }
}
