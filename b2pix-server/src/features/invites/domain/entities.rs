use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use crate::features::shared::{StacksAddress, Username, Email};

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

// Optional DateTime serialization for fields that can be None
mod optional_bson_datetime_compatible {
    use serde::{self, Deserialize, Deserializer, Serialize, Serializer};
    use mongodb::bson::{DateTime as BsonDateTime, Bson};
    use chrono::{DateTime, Utc};

    pub fn serialize<S>(date_opt: &Option<DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match date_opt {
            Some(date) => {
                let timestamp_millis = date.timestamp_millis();
                let bson_dt = BsonDateTime::from_millis(timestamp_millis);
                let bson_value = Bson::DateTime(bson_dt);
                bson_value.serialize(serializer)
            }
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let bson_opt = Option::<Bson>::deserialize(deserializer)?;
        match bson_opt {
            Some(bson_value) => match bson_value {
                Bson::DateTime(bson_dt) => {
                    let timestamp_millis = bson_dt.timestamp_millis();
                    DateTime::from_timestamp_millis(timestamp_millis)
                        .map(Some)
                        .ok_or_else(|| serde::de::Error::custom("Invalid timestamp"))
                }
                Bson::String(date_str) => {
                    DateTime::parse_from_rfc3339(&date_str)
                        .map(|dt| Some(dt.with_timezone(&Utc)))
                        .map_err(|e| serde::de::Error::custom(format!("Invalid date format: {}", e)))
                }
                Bson::Null => Ok(None),
                _ => Err(serde::de::Error::custom("Expected DateTime, String, or null")),
            },
            None => Ok(None),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct InviteId(ObjectId);

impl InviteId {
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

impl std::fmt::Display for InviteId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InviteCode(String);

impl InviteCode {
    pub fn generate() -> Self {
        Self(crate::common::utils::generate_code(8))
    }

    pub fn from_string(code: String) -> Self {
        Self(code)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum InviteStatus {
    CREATED,
    CLAIMED,
    BLOCKED,
    CANCELED,
}

impl InviteStatus {
    pub fn from_string(status: &str) -> Result<Self, crate::common::errors::InviteError> {
        match status {
            "created" => Ok(InviteStatus::CREATED),
            "claimed" => Ok(InviteStatus::CLAIMED),
            "blocked" => Ok(InviteStatus::BLOCKED),
            "canceled" => Ok(InviteStatus::CANCELED),
            _ => Err(crate::common::errors::InviteError::Internal(format!("Invalid status: {}", status))),
        }
    }
}

impl std::fmt::Display for InviteStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            InviteStatus::CREATED => write!(f, "created"),
            InviteStatus::CLAIMED => write!(f, "claimed"),
            InviteStatus::BLOCKED => write!(f, "blocked"),
            InviteStatus::CANCELED => write!(f, "canceled"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum BankStatus {
    PENDING,
    PROCESSING,
    SUCCESS,
    FAILED,
}

impl BankStatus {
    pub fn from_string(status: &str) -> Result<Self, crate::common::errors::InviteError> {
        match status {
            "pending" => Ok(BankStatus::PENDING),
            "processing" => Ok(BankStatus::PROCESSING),
            "success" => Ok(BankStatus::SUCCESS),
            "failed" => Ok(BankStatus::FAILED),
            _ => Err(crate::common::errors::InviteError::Internal(format!("Invalid bank status: {}", status))),
        }
    }
}

impl std::fmt::Display for BankStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BankStatus::PENDING => write!(f, "pending"),
            BankStatus::PROCESSING => write!(f, "processing"),
            BankStatus::SUCCESS => write!(f, "success"),
            BankStatus::FAILED => write!(f, "failed"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invite {
    #[serde(rename = "_id")]
    pub id: InviteId,
    pub code: InviteCode,
    pub email: Email,
    pub address: Option<StacksAddress>, // endereço do usuário que recebeu o invite, só é preenchido quando se realiza o claim
    pub username: Option<Username>,
    pub parent_id: StacksAddress, // endereço que enviou o Invite
    pub status: InviteStatus,
    #[serde(with = "bson_datetime_compatible")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "optional_bson_datetime_compatible")]
    pub claimed_at: Option<DateTime<Utc>>,
    // Bank status tracking (credentials moved to BankCredentials entity)
    pub bank_status: BankStatus,
}

impl Invite {
    pub fn new(email: Email, parent_id: StacksAddress) -> Self {
        Self {
            id: InviteId::new(),
            code: InviteCode::generate(),
            email,
            address: None,
            username: None,
            parent_id,
            status: InviteStatus::CREATED,
            created_at: Utc::now(),
            claimed_at: None,
            bank_status: BankStatus::PENDING,
        }
    }

    pub fn claim(&mut self, username: Username, address: StacksAddress) -> Result<(), crate::common::errors::InviteError> {
        match self.status {
            InviteStatus::CLAIMED => return Err(crate::common::errors::InviteError::InvalidStatusTransition),
            InviteStatus::BLOCKED => return Err(crate::common::errors::InviteError::InvalidStatusTransition),
            InviteStatus::CANCELED => return Err(crate::common::errors::InviteError::InvalidStatusTransition),
            InviteStatus::CREATED => {}
        }

        self.username = Some(username);
        self.address = Some(address);
        self.status = InviteStatus::CLAIMED;
        self.claimed_at = Some(Utc::now());
        
        Ok(())
    }

    pub fn block(&mut self) -> Result<(), crate::common::errors::InviteError> {
        match self.status {
            InviteStatus::CREATED => {
                self.status = InviteStatus::BLOCKED;
                Ok(())
            }
            _ => Err(crate::common::errors::InviteError::InvalidStatusTransition),
        }
    }

    pub fn cancel(&mut self) -> Result<(), crate::common::errors::InviteError> {
        match self.status {
            InviteStatus::CREATED => {
                self.status = InviteStatus::CANCELED;
                Ok(())
            }
            _ => Err(crate::common::errors::InviteError::InvalidStatusTransition),
        }
    }

    // Getter methods
    pub fn id(&self) -> &InviteId {
        &self.id
    }

    pub fn code(&self) -> &InviteCode {
        &self.code
    }

    pub fn email(&self) -> &Email {
        &self.email
    }

    pub fn address(&self) -> &Option<StacksAddress> {
        &self.address
    }

    pub fn username(&self) -> &Option<Username> {
        &self.username
    }

    pub fn parent_id(&self) -> &StacksAddress {
        &self.parent_id
    }

    pub fn status(&self) -> &InviteStatus {
        &self.status
    }

    pub fn created_at(&self) -> &DateTime<Utc> {
        &self.created_at
    }

    pub fn claimed_at(&self) -> &Option<DateTime<Utc>> {
        &self.claimed_at
    }

    pub fn bank_status(&self) -> &BankStatus {
        &self.bank_status
    }

    pub fn set_bank_status(&mut self, status: BankStatus) {
        self.bank_status = status;
    }
}
