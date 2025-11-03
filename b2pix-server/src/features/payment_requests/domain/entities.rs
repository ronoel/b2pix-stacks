use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use mongodb::bson::oid::ObjectId;

// Custom serialization/deserialization for DateTime with BSON compatibility
mod bson_datetime_compatible {
    use serde::{self, Deserialize, Deserializer, Serialize, Serializer};
    use mongodb::bson::{DateTime as BsonDateTime, Bson};
    use chrono::{DateTime, Utc};

    pub fn serialize<S>(date: &DateTime<Utc>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let timestamp_millis = date.timestamp_millis();
        let bson_dt = BsonDateTime::from_millis(timestamp_millis);
        let bson_value = Bson::DateTime(bson_dt);
        bson_value.serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<DateTime<Utc>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let bson_value = Bson::deserialize(deserializer)?;
        match bson_value {
            Bson::DateTime(bson_dt) => {
                let timestamp_millis = bson_dt.timestamp_millis();
                DateTime::from_timestamp_millis(timestamp_millis)
                    .ok_or_else(|| serde::de::Error::custom("Invalid timestamp"))
            }
            Bson::String(date_str) => {
                // Handle RFC 3339 string format as fallback
                DateTime::parse_from_rfc3339(&date_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|e| serde::de::Error::custom(format!("Invalid date format: {}", e)))
            }
            _ => Err(serde::de::Error::custom("Expected DateTime or String")),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct PaymentRequestId(String);

impl PaymentRequestId {
    pub fn new() -> Self {
        Self(Uuid::new_v4().to_string())
    }

    pub fn from_string(id: String) -> Self {
        Self(id)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentStatus {
    /// Payment is waiting to be processed
    #[serde(rename = "waiting")]
    Waiting,
    /// Payment transaction is being processed (broadcasting)
    Processing,
    /// Payment transaction broadcast successfully (pending confirmation)
    Broadcast,
    /// Payment transaction failed to broadcast
    Failed,
    /// Payment transaction confirmed on blockchain
    Confirmed,
}

impl Default for PaymentStatus {
    fn default() -> Self {
        PaymentStatus::Waiting
    }
}

impl PaymentStatus {
    pub fn from_string(status: &str) -> Result<Self, String> {
        match status {
            "waiting" => Ok(PaymentStatus::Waiting),
            "processing" => Ok(PaymentStatus::Processing),
            "broadcast" => Ok(PaymentStatus::Broadcast),
            "failed" => Ok(PaymentStatus::Failed),
            "confirmed" => Ok(PaymentStatus::Confirmed),
            _ => Err(format!("Invalid payment status: {}", status)),
        }
    }
}

impl std::fmt::Display for PaymentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PaymentStatus::Waiting => write!(f, "waiting"),
            PaymentStatus::Processing => write!(f, "processing"),
            PaymentStatus::Broadcast => write!(f, "broadcast"),
            PaymentStatus::Failed => write!(f, "failed"),
            PaymentStatus::Confirmed => write!(f, "confirmed"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourceType {
    Advertisement,
    Buy,
}

impl SourceType {
    pub fn from_string(source_type: &str) -> Result<Self, String> {
        match source_type {
            "advertisement" => Ok(SourceType::Advertisement),
            "buy" => Ok(SourceType::Buy),
            _ => Err(format!("Invalid source type: {}", source_type)),
        }
    }
}

impl std::fmt::Display for SourceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SourceType::Advertisement => write!(f, "advertisement"),
            SourceType::Buy => write!(f, "buy"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRequest {
    pub id: PaymentRequestId,
    pub source_type: SourceType,
    pub source_id: ObjectId,
    pub receiver_address: String,
    pub amount: u64,
    pub description: String,
    pub status: PaymentStatus,
    pub blockchain_tx_id: Option<String>,
    #[serde(with = "bson_datetime_compatible")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "bson_datetime_compatible")]
    pub updated_at: DateTime<Utc>,
}

impl PaymentRequest {
    pub fn new(
        source_type: SourceType,
        source_id: ObjectId,
        receiver_address: String,
        amount: u64,
        description: String,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: PaymentRequestId::new(),
            source_type,
            source_id,
            receiver_address,
            amount,
            description,
            status: PaymentStatus::default(),
            blockchain_tx_id: None,
            created_at: now,
            updated_at: now,
        }
    }

    // Getter methods
    pub fn id(&self) -> &PaymentRequestId {
        &self.id
    }

    pub fn source_type(&self) -> &SourceType {
        &self.source_type
    }

    pub fn source_id(&self) -> &ObjectId {
        &self.source_id
    }

    pub fn receiver_address(&self) -> &str {
        &self.receiver_address
    }

    pub fn amount(&self) -> u64 {
        self.amount
    }

    pub fn status(&self) -> &PaymentStatus {
        &self.status
    }

    pub fn blockchain_tx_id(&self) -> &Option<String> {
        &self.blockchain_tx_id
    }

    pub fn created_at(&self) -> &DateTime<Utc> {
        &self.created_at
    }

    pub fn updated_at(&self) -> &DateTime<Utc> {
        &self.updated_at
    }

    // Setter methods
    pub fn set_status(&mut self, status: PaymentStatus) {
        self.status = status;
        self.updated_at = Utc::now();
    }

    pub fn set_blockchain_tx_id(&mut self, tx_id: String) {
        self.blockchain_tx_id = Some(tx_id);
        self.updated_at = Utc::now();
    }
}
