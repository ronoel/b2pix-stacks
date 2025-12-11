use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use crate::common::errors::AdvertisementDepositError;
use crate::features::advertisements::domain::entities::AdvertisementId;

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

// Optional u128 serialization for amount
mod optional_u128_as_i64 {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<S>(value: &Option<u128>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match value {
            Some(v) => {
                let i64_value = i64::try_from(*v)
                    .map_err(|_| serde::ser::Error::custom("Value too large for i64"))?;
                Some(i64_value).serialize(serializer)
            }
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<u128>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let opt: Option<i64> = Option::deserialize(deserializer)?;
        match opt {
            Some(i64_value) => {
                if i64_value < 0 {
                    return Err(serde::de::Error::custom("Negative values not allowed"));
                }
                Ok(Some(i64_value as u128))
            }
            None => Ok(None),
        }
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

// Optional DateTime serialization
mod optional_bson_datetime {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    use mongodb::bson::{DateTime as BsonDateTime};
    use chrono::{DateTime, Utc};

    pub fn serialize<S>(date: &Option<DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match date {
            Some(dt) => {
                let timestamp_millis = dt.timestamp_millis();
                let bson_dt = BsonDateTime::from_millis(timestamp_millis);
                Some(bson_dt).serialize(serializer)
            }
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let opt: Option<BsonDateTime> = Option::deserialize(deserializer)?;
        match opt {
            Some(bson_dt) => {
                let timestamp_millis = bson_dt.timestamp_millis();
                DateTime::from_timestamp_millis(timestamp_millis)
                    .map(Some)
                    .ok_or_else(|| serde::de::Error::custom("Invalid timestamp"))
            }
            None => Ok(None),
        }
    }
}

/// Unique identifier for an advertisement deposit
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct AdvertisementDepositId(ObjectId);

impl AdvertisementDepositId {
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

impl std::fmt::Display for AdvertisementDepositId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Advertisement deposit status enumeration
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AdvertisementDepositStatus {
    /// Deposit created, transaction not yet broadcasted
    Draft,
    /// Transaction broadcasted, awaiting blockchain confirmation
    Pending,
    /// Transaction confirmed on-chain, funds added to advertisement
    Confirmed,
    /// Transaction failed or was rejected
    Failed,
}

impl AdvertisementDepositStatus {
    /// Check if status can transition to the target status
    pub fn can_transition_to(&self, target: &AdvertisementDepositStatus) -> bool {
        use AdvertisementDepositStatus::*;

        match (self, target) {
            // From Draft
            (Draft, Pending) => true,
            (Draft, Failed) => true,

            // From Pending
            (Pending, Confirmed) => true,
            (Pending, Failed) => true,

            // From Confirmed or Failed - no transitions allowed (terminal states)
            (Confirmed, _) => false,
            (Failed, _) => false,

            // Same status
            (a, b) if a == b => true,

            // All other transitions are invalid
            _ => false,
        }
    }
}

/// Represents a cryptocurrency deposit to an advertisement
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvertisementDeposit {
    #[serde(rename = "_id")]
    pub id: AdvertisementDepositId,

    /// Reference to the parent advertisement
    pub advertisement_id: AdvertisementId,

    /// Seller's wallet address (for validation)
    pub seller_address: String,

    /// Blockchain transaction ID (set after broadcasting via Bolt Protocol)
    pub blockchain_tx_id: Option<String>,

    /// Serialized transaction for broadcasting
    pub serialized_transaction: String,

    /// Amount of crypto in this deposit (in minimal units, e.g., satoshis)
    /// Optional because it's set after Bolt Protocol responds with the amount
    #[serde(with = "optional_u128_as_i64")]
    pub amount: Option<u128>,

    /// Deposit status
    pub status: AdvertisementDepositStatus,

    /// Creation timestamp
    #[serde(with = "bson_datetime_to_chrono")]
    pub created_at: DateTime<Utc>,

    /// Last update timestamp
    #[serde(with = "bson_datetime_to_chrono")]
    pub updated_at: DateTime<Utc>,

    /// When the deposit was confirmed on-chain
    #[serde(with = "optional_bson_datetime")]
    pub confirmed_at: Option<DateTime<Utc>>,
}

impl AdvertisementDeposit {
    /// Create a new deposit in draft status (without amount, will be set after Bolt broadcast)
    pub fn new(
        advertisement_id: AdvertisementId,
        seller_address: String,
        serialized_transaction: String,
    ) -> Result<Self, AdvertisementDepositError> {
        if serialized_transaction.is_empty() {
            return Err(AdvertisementDepositError::InvalidTransaction);
        }

        let now = Utc::now();

        Ok(Self {
            id: AdvertisementDepositId::new(),
            advertisement_id,
            seller_address,
            blockchain_tx_id: None,
            serialized_transaction,
            amount: None, // Will be set after Bolt broadcast
            status: AdvertisementDepositStatus::Draft,
            created_at: now,
            updated_at: now,
            confirmed_at: None,
        })
    }

    /// Set amount and blockchain transaction ID after successful Bolt broadcast
    pub fn set_broadcast_info(&mut self, blockchain_tx_id: String, amount: u128) -> Result<(), AdvertisementDepositError> {
        if amount == 0 {
            return Err(AdvertisementDepositError::InvalidAmount);
        }

        self.blockchain_tx_id = Some(blockchain_tx_id);
        self.amount = Some(amount);
        self.updated_at = Utc::now();

        Ok(())
    }

    /// Change deposit status
    pub fn change_status(&mut self, new_status: AdvertisementDepositStatus) -> Result<(), AdvertisementDepositError> {
        if !self.status.can_transition_to(&new_status) {
            return Err(AdvertisementDepositError::InvalidStatusTransition);
        }

        self.status = new_status;
        self.updated_at = Utc::now();

        Ok(())
    }

    /// Mark deposit as pending (status change only, blockchain_tx_id should already be set)
    pub fn mark_pending(&mut self) -> Result<(), AdvertisementDepositError> {
        if self.status != AdvertisementDepositStatus::Draft {
            return Err(AdvertisementDepositError::InvalidStatusTransition);
        }

        self.status = AdvertisementDepositStatus::Pending;
        self.updated_at = Utc::now();

        Ok(())
    }

    /// Mark deposit as confirmed
    pub fn confirm(&mut self) -> Result<(), AdvertisementDepositError> {
        if self.status != AdvertisementDepositStatus::Pending {
            return Err(AdvertisementDepositError::InvalidStatusTransition);
        }

        let now = Utc::now();
        self.status = AdvertisementDepositStatus::Confirmed;
        self.confirmed_at = Some(now);
        self.updated_at = now;

        Ok(())
    }

    /// Mark deposit as failed
    pub fn fail(&mut self) -> Result<(), AdvertisementDepositError> {
        if self.status == AdvertisementDepositStatus::Confirmed {
            return Err(AdvertisementDepositError::InvalidStatusTransition);
        }

        self.status = AdvertisementDepositStatus::Failed;
        self.updated_at = Utc::now();

        Ok(())
    }

    /// Check if deposit is in a terminal state
    pub fn is_final(&self) -> bool {
        matches!(
            self.status,
            AdvertisementDepositStatus::Confirmed | AdvertisementDepositStatus::Failed
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_deposit_valid() {
        let ad_id = AdvertisementId::new();
        let result = AdvertisementDeposit::new(
            ad_id,
            "SP2ABC123".to_string(),
            "0x123abc".to_string(),
        );

        assert!(result.is_ok());
        let deposit = result.unwrap();
        assert_eq!(deposit.amount, None); // Amount not set yet
        assert_eq!(deposit.status, AdvertisementDepositStatus::Draft);
        assert!(deposit.blockchain_tx_id.is_none());
        assert!(deposit.confirmed_at.is_none());
    }

    #[test]
    fn test_set_broadcast_info() {
        let ad_id = AdvertisementId::new();
        let mut deposit = AdvertisementDeposit::new(
            ad_id,
            "SP2ABC123".to_string(),
            "0x123abc".to_string(),
        ).unwrap();

        // Set broadcast info
        assert!(deposit.set_broadcast_info("txid123".to_string(), 100_000).is_ok());
        assert_eq!(deposit.blockchain_tx_id, Some("txid123".to_string()));
        assert_eq!(deposit.amount, Some(100_000));

        // Cannot set zero amount
        let mut deposit2 = AdvertisementDeposit::new(
            AdvertisementId::new(),
            "SP2ABC123".to_string(),
            "0x123abc".to_string(),
        ).unwrap();
        assert!(matches!(
            deposit2.set_broadcast_info("txid".to_string(), 0),
            Err(AdvertisementDepositError::InvalidAmount)
        ));
    }

    #[test]
    fn test_new_deposit_empty_transaction() {
        let ad_id = AdvertisementId::new();
        let result = AdvertisementDeposit::new(
            ad_id,
            "SP2ABC123".to_string(),
            "".to_string(),
        );

        assert!(matches!(result, Err(AdvertisementDepositError::InvalidTransaction)));
    }

    #[test]
    fn test_status_transitions() {
        let ad_id = AdvertisementId::new();
        let mut deposit = AdvertisementDeposit::new(
            ad_id,
            "SP2ABC123".to_string(),
            "0x123abc".to_string(),
        ).unwrap();

        // Set broadcast info first
        deposit.set_broadcast_info("txid123".to_string(), 100_000).unwrap();

        // Draft -> Pending
        assert!(deposit.mark_pending().is_ok());
        assert_eq!(deposit.status, AdvertisementDepositStatus::Pending);
        assert_eq!(deposit.blockchain_tx_id, Some("txid123".to_string()));

        // Pending -> Confirmed
        assert!(deposit.confirm().is_ok());
        assert_eq!(deposit.status, AdvertisementDepositStatus::Confirmed);
        assert!(deposit.confirmed_at.is_some());

        // Confirmed -> cannot change
        assert!(deposit.fail().is_err());
    }

    #[test]
    fn test_pending_to_failed() {
        let ad_id = AdvertisementId::new();
        let mut deposit = AdvertisementDeposit::new(
            ad_id,
            "SP2ABC123".to_string(),
            "0x123abc".to_string(),
        ).unwrap();

        deposit.set_broadcast_info("txid123".to_string(), 100_000).unwrap();
        deposit.mark_pending().unwrap();
        assert!(deposit.fail().is_ok());
        assert_eq!(deposit.status, AdvertisementDepositStatus::Failed);
    }
}
