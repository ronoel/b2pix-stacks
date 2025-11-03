use async_trait::async_trait;
use mongodb::{Database, Collection, bson::doc};
use futures::stream::TryStreamExt;
use chrono::DateTime;
use serde::{Serialize, Deserialize};
use mongodb::bson::oid::ObjectId;

use crate::features::invites::domain::entities::{Invite, InviteId, InviteCode, InviteStatus};
use crate::features::invites::ports::InviteRepository;
use crate::features::shared::{StacksAddress, Username, Email};
use crate::common::errors::InviteError;

#[derive(Debug, Serialize, Deserialize)]
struct InviteDocument {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub code: String,
    pub email: String,
    pub address: Option<String>,
    pub username: Option<String>,
    pub parent_id: String,
    pub status: String,
    pub created_at: mongodb::bson::DateTime,
    pub claimed_at: Option<mongodb::bson::DateTime>,
    pub bank_status: String,
}

impl From<&Invite> for InviteDocument {
    fn from(invite: &Invite) -> Self {
        Self {
            id: invite.id().as_object_id().clone(),
            code: invite.code().as_str().to_string(),
            email: invite.email().as_str().to_string(),
            address: invite.address().as_ref().map(|a| a.as_str().to_string()),
            username: invite.username().as_ref().map(|u| u.as_str().to_string()),
            parent_id: invite.parent_id().as_str().to_string(),
            status: invite.status().to_string(),
            created_at: mongodb::bson::DateTime::from_millis(invite.created_at().timestamp_millis()),
            claimed_at: invite.claimed_at().map(|dt| mongodb::bson::DateTime::from_millis(dt.timestamp_millis())),
            bank_status: invite.bank_status().to_string(),
        }
    }
}

impl TryFrom<InviteDocument> for Invite {
    type Error = InviteError;

    fn try_from(doc: InviteDocument) -> Result<Self, Self::Error> {
        let created_at = DateTime::from_timestamp_millis(doc.created_at.timestamp_millis())
            .ok_or_else(|| InviteError::Internal("Invalid created_at timestamp".to_string()))?;
        
        let claimed_at = if let Some(claimed_at_bson) = doc.claimed_at {
            Some(DateTime::from_timestamp_millis(claimed_at_bson.timestamp_millis())
                .ok_or_else(|| InviteError::Internal("Invalid claimed_at timestamp".to_string()))?)
        } else {
            None
        };

        let status = InviteStatus::from_string(&doc.status)?;
        let bank_status = crate::features::invites::domain::entities::BankStatus::from_string(&doc.bank_status)?;
        let address = doc.address.map(|a| StacksAddress::from_string(a));
        let username = doc.username.map(|u| Username::from_string(u));

        Ok(Invite {
            id: InviteId::from_object_id(doc.id),
            code: InviteCode::from_string(doc.code),
            email: Email::from_string(doc.email),
            address,
            username,
            parent_id: StacksAddress::from_string(doc.parent_id),
            status,
            created_at,
            claimed_at,
            bank_status,
        })
    }
}

pub struct InviteRepositoryImpl {
    collection: Collection<InviteDocument>,
}

impl InviteRepositoryImpl {
    pub fn new(database: &Database) -> Self {
        let collection = database.collection::<InviteDocument>("invites");
        Self { collection }
    }
}

#[async_trait]
impl InviteRepository for InviteRepositoryImpl {
    async fn save(&self, invite: &Invite) -> Result<(), InviteError> {
        let doc = InviteDocument::from(invite);
        let filter = doc! { "_id": &doc.id };
        
        match self.collection
            .replace_one(filter, &doc, mongodb::options::ReplaceOptions::builder().upsert(true).build())
            .await {
            Ok(_) => Ok(()),
            Err(e) => {
                // Check if it's a MongoDB duplicate key error (E11000)
                if let mongodb::error::ErrorKind::Write(mongodb::error::WriteFailure::WriteError(write_error)) = e.kind.as_ref() {
                    if write_error.code == 11000 {
                        let message = write_error.message.to_lowercase();
                        if message.contains("username") {
                            return Err(InviteError::DuplicateUsername);
                        } else if message.contains("address") {
                            return Err(InviteError::Internal("Address already exists".to_string()));
                        } else {
                            return Err(InviteError::Internal(format!("Duplicate key error: {}", write_error.message)));
                        }
                    }
                }
                Err(InviteError::from(e))
            }
        }
    }

    async fn find_by_id(&self, id: &InviteId) -> Result<Option<Invite>, InviteError> {
        let filter = doc! { "_id": id.as_object_id() };
        
        if let Some(doc) = self.collection.find_one(filter, None).await? {
            Ok(Some(doc.try_into()?))
        } else {
            Ok(None)
        }
    }

    async fn find_by_code(&self, code: &InviteCode) -> Result<Option<Invite>, InviteError> {
        let filter = doc! { "code": code.as_str() };
        
        if let Some(doc) = self.collection.find_one(filter, None).await? {
            Ok(Some(doc.try_into()?))
        } else {
            Ok(None)
        }
    }

    async fn find_by_email(&self, email: &Email) -> Result<Option<Invite>, InviteError> {
        let filter = doc! { "email": email.as_str() };
        
        if let Some(doc) = self.collection.find_one(filter, None).await? {
            Ok(Some(doc.try_into()?))
        } else {
            Ok(None)
        }
    }

    async fn find_by_username(&self, username: &Username) -> Result<Option<Invite>, InviteError> {
        let filter = doc! { "username": username.as_str() };
        
        if let Some(doc) = self.collection.find_one(filter, None).await? {
            Ok(Some(doc.try_into()?))
        } else {
            Ok(None)
        }
    }

    async fn find_by_address(&self, address: &StacksAddress) -> Result<Option<Invite>, InviteError> {
        let filter = doc! { "address": address.as_str() };
        
        if let Some(doc) = self.collection.find_one(filter, None).await? {
            Ok(Some(doc.try_into()?))
        } else {
            Ok(None)
        }
    }

    async fn find_by_status(&self, status: &InviteStatus) -> Result<Vec<Invite>, InviteError> {
        let filter = doc! { "status": status.to_string() };
        let cursor = self.collection.find(filter, None).await?;
        let docs: Vec<InviteDocument> = cursor.try_collect().await?;
        
        let mut invites = Vec::new();
        for doc in docs {
            invites.push(doc.try_into()?);
        }
        
        Ok(invites)
    }

    async fn delete(&self, id: &InviteId) -> Result<bool, InviteError> {
        let filter = doc! { "_id": id.as_object_id() };
        let result = self.collection.delete_one(filter, None).await?;
        Ok(result.deleted_count > 0)
    }
}

impl InviteRepositoryImpl {
    /// Creates all necessary indexes for the invites collection
    pub async fn create_indexes(&self) -> Result<(), InviteError> {
        use mongodb::options::{IndexOptions, CreateIndexOptions};
        use mongodb::{IndexModel, bson::doc};
        use futures::stream::TryStreamExt;

        // First, check existing indexes to avoid conflicts
        // If the collection doesn't exist, list_indexes will fail, so we handle that case
        let existing_index_names = match self.collection.list_indexes(None).await {
            Ok(cursor) => {
                let index_models: Vec<IndexModel> = cursor.try_collect().await
                    .map_err(|e| InviteError::Internal(format!("Failed to collect indexes: {}", e)))?;
                
                let mut names = std::collections::HashSet::new();
                for index_model in index_models {
                    if let Some(name) = index_model.options.as_ref().and_then(|opts| opts.name.as_ref()) {
                        names.insert(name.clone());
                    }
                }
                names
            },
            Err(_) => {
                // Collection doesn't exist yet, so no indexes exist
                tracing::debug!("Collection doesn't exist yet, will create all indexes");
                std::collections::HashSet::new()
            }
        };

        let mut indexes = Vec::new();

        // 1. Unique index on code (for all documents)
        // This ensures invite codes are always unique across all statuses
        if !existing_index_names.contains("code_unique") {
            // Drop any existing code index first to avoid conflicts
            if let Err(_) = self.collection.drop_index("code_1", None).await {
                // Ignore error if index doesn't exist
                tracing::debug!("No existing code_1 index to drop");
            }
            
            indexes.push(IndexModel::builder()
                .keys(doc! { "code": 1 })
                .options(IndexOptions::builder()
                    .unique(true)
                    .name("code_unique".to_string())
                    .build())
                .build());
        }

        // 2. Partial unique index on address (only when address is not null)
        // This ensures wallet addresses can only claim one invite
        if !existing_index_names.contains("address_unique_partial") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "address": 1 })
                .options(IndexOptions::builder()
                    .unique(true)
                    .partial_filter_expression(doc! { 
                        "address": { "$exists": true, "$type": "string" } 
                    })
                    .name("address_unique_partial".to_string())
                    .build())
                .build());
        }

        // 3. Partial unique index on username (only when username is not null)
        // This ensures usernames are unique across claimed invites
        if !existing_index_names.contains("username_unique_partial") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "username": 1 })
                .options(IndexOptions::builder()
                    .unique(true)
                    .partial_filter_expression(doc! { 
                        "username": { "$exists": true, "$type": "string" } 
                    })
                    .name("username_unique_partial".to_string())
                    .build())
                .build());
        }

        // 4. Compound index on code + status for efficient lookups of active codes
        // Optimizes queries for finding created invites by code
        if !existing_index_names.contains("code_status_compound") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "code": 1, "status": 1 })
                .options(IndexOptions::builder()
                    .name("code_status_compound".to_string())
                    .build())
                .build());
        }

        // 5. Index on email for lookup efficiency
        if !existing_index_names.contains("email_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "email": 1 })
                .options(IndexOptions::builder()
                    .name("email_index".to_string())
                    .build())
                .build());
        }

        // 6. Index on parent_id for tracking sent invites
        if !existing_index_names.contains("parent_id_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "parent_id": 1 })
                .options(IndexOptions::builder()
                    .name("parent_id_index".to_string())
                    .build())
                .build());
        }

        // 7. Index on status for filtering by invite status
        if !existing_index_names.contains("status_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "status": 1 })
                .options(IndexOptions::builder()
                    .name("status_index".to_string())
                    .build())
                .build());
        }

        // 8. Index on created_at for chronological queries
        if !existing_index_names.contains("created_at_desc") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "created_at": -1 })
                .options(IndexOptions::builder()
                    .name("created_at_desc".to_string())
                    .build())
                .build());
        }

        // Only create indexes if there are any to create
        if !indexes.is_empty() {
            self.collection
            .create_indexes(indexes, CreateIndexOptions::builder().build())
            .await
            .map_err(|e| InviteError::Internal(format!("Failed to create indexes: {}", e)))?;
        }

        Ok(())
    }
}
