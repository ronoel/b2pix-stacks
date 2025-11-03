use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use crate::features::shared::StacksAddress;

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
                DateTime::parse_from_rfc3339(&date_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|e| serde::de::Error::custom(format!("Invalid date format: {}", e)))
            }
            _ => Err(serde::de::Error::custom("Expected DateTime or String")),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BankCredentialsId(ObjectId);

impl BankCredentialsId {
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

impl std::fmt::Display for BankCredentialsId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum BankCredentialsStatus {
    ACTIVE,
    INACTIVE,
    REVOKED,
}

impl BankCredentialsStatus {
    pub fn from_string(status: &str) -> Result<Self, crate::common::errors::InviteError> {
        match status {
            "active" => Ok(BankCredentialsStatus::ACTIVE),
            "inactive" => Ok(BankCredentialsStatus::INACTIVE),
            "revoked" => Ok(BankCredentialsStatus::REVOKED),
            _ => Err(crate::common::errors::InviteError::Internal(format!("Invalid bank credentials status: {}", status))),
        }
    }
}

impl std::fmt::Display for BankCredentialsStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BankCredentialsStatus::ACTIVE => write!(f, "active"),
            BankCredentialsStatus::INACTIVE => write!(f, "inactive"),
            BankCredentialsStatus::REVOKED => write!(f, "revoked"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankCredentials {
    #[serde(rename = "_id")]
    pub id: BankCredentialsId,
    pub address: StacksAddress,
    pub status: BankCredentialsStatus,
    pub client_id: String,
    pub client_secret: String,
    pub certificate_gcs_path: String,
    #[serde(with = "bson_datetime_compatible")]
    pub created_at: DateTime<Utc>,
}

impl BankCredentials {
    pub fn new(
        address: StacksAddress,
        client_id: String,
        client_secret: String,
        certificate_gcs_path: String,
    ) -> Self {
        Self {
            id: BankCredentialsId::new(),
            address,
            status: BankCredentialsStatus::ACTIVE,
            client_id,
            client_secret,
            certificate_gcs_path,
            created_at: Utc::now(),
        }
    }

    pub fn revoke(&mut self) {
        self.status = BankCredentialsStatus::REVOKED;
    }

    pub fn deactivate(&mut self) {
        self.status = BankCredentialsStatus::INACTIVE;
    }

    pub fn activate(&mut self) {
        self.status = BankCredentialsStatus::ACTIVE;
    }

    // Getter methods
    pub fn id(&self) -> &BankCredentialsId {
        &self.id
    }

    pub fn address(&self) -> &StacksAddress {
        &self.address
    }

    pub fn status(&self) -> &BankCredentialsStatus {
        &self.status
    }

    pub fn client_id(&self) -> &str {
        &self.client_id
    }

    pub fn client_secret(&self) -> &str {
        &self.client_secret
    }

    pub fn certificate_gcs_path(&self) -> &str {
        &self.certificate_gcs_path
    }

    pub fn created_at(&self) -> &DateTime<Utc> {
        &self.created_at
    }
}
