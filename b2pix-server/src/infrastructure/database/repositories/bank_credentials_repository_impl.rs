use async_trait::async_trait;
use mongodb::{Database, Collection, bson::doc};
use futures::stream::TryStreamExt;
use chrono::DateTime;
use serde::{Serialize, Deserialize};
use mongodb::bson::oid::ObjectId;

use crate::features::bank_credentials::domain::entities::{BankCredentials, BankCredentialsId, BankCredentialsStatus};
use crate::features::bank_credentials::ports::BankCredentialsRepository;
use crate::features::shared::StacksAddress;
use crate::common::errors::InviteError;

#[derive(Debug, Serialize, Deserialize)]
struct BankCredentialsDocument {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub address: String,
    pub status: String,
    pub client_id: String,
    pub client_secret: String,
    pub certificate_gcs_path: String,
    pub created_at: mongodb::bson::DateTime,
}

impl From<&BankCredentials> for BankCredentialsDocument {
    fn from(credentials: &BankCredentials) -> Self {
        Self {
            id: credentials.id().as_object_id().clone(),
            address: credentials.address().as_str().to_string(),
            status: credentials.status().to_string(),
            client_id: credentials.client_id().to_string(),
            client_secret: credentials.client_secret().to_string(),
            certificate_gcs_path: credentials.certificate_gcs_path().to_string(),
            created_at: mongodb::bson::DateTime::from_millis(credentials.created_at().timestamp_millis()),
        }
    }
}

impl TryFrom<BankCredentialsDocument> for BankCredentials {
    type Error = InviteError;

    fn try_from(doc: BankCredentialsDocument) -> Result<Self, Self::Error> {
        let created_at = DateTime::from_timestamp_millis(doc.created_at.timestamp_millis())
            .ok_or_else(|| InviteError::Internal("Invalid created_at timestamp".to_string()))?;

        let status = BankCredentialsStatus::from_string(&doc.status)?;

        Ok(BankCredentials {
            id: BankCredentialsId::from_object_id(doc.id),
            address: StacksAddress::from_string(doc.address),
            status,
            client_id: doc.client_id,
            client_secret: doc.client_secret,
            certificate_gcs_path: doc.certificate_gcs_path,
            created_at,
        })
    }
}

pub struct BankCredentialsRepositoryImpl {
    collection: Collection<BankCredentialsDocument>,
}

impl BankCredentialsRepositoryImpl {
    pub fn new(database: &Database) -> Self {
        let collection = database.collection::<BankCredentialsDocument>("bank_credentials");
        Self { collection }
    }
}

#[async_trait]
impl BankCredentialsRepository for BankCredentialsRepositoryImpl {
    async fn save(&self, credentials: &BankCredentials) -> Result<(), InviteError> {
        let doc = BankCredentialsDocument::from(credentials);
        let filter = doc! { "_id": &doc.id };

        match self.collection
            .replace_one(filter, &doc, mongodb::options::ReplaceOptions::builder().upsert(true).build())
            .await {
            Ok(_) => Ok(()),
            Err(e) => Err(InviteError::from(e))
        }
    }

    async fn find_by_id(&self, id: &BankCredentialsId) -> Result<Option<BankCredentials>, InviteError> {
        let filter = doc! { "_id": id.as_object_id() };

        if let Some(doc) = self.collection.find_one(filter, None).await? {
            Ok(Some(doc.try_into()?))
        } else {
            Ok(None)
        }
    }

    async fn find_latest_by_address(&self, address: &StacksAddress) -> Result<Option<BankCredentials>, InviteError> {
        let filter = doc! {
            "address": address.as_str(),
            "status": "active"
        };

        let options = mongodb::options::FindOneOptions::builder()
            .sort(doc! { "created_at": -1 })
            .build();

        if let Some(doc) = self.collection.find_one(filter, options).await? {
            Ok(Some(doc.try_into()?))
        } else {
            Ok(None)
        }
    }

    async fn find_all_by_address(&self, address: &StacksAddress) -> Result<Vec<BankCredentials>, InviteError> {
        let filter = doc! { "address": address.as_str() };

        let options = mongodb::options::FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .build();

        let cursor = self.collection.find(filter, options).await?;
        let docs: Vec<BankCredentialsDocument> = cursor.try_collect().await?;

        let mut credentials_list = Vec::new();
        for doc in docs {
            credentials_list.push(doc.try_into()?);
        }

        Ok(credentials_list)
    }
}

impl BankCredentialsRepositoryImpl {
    /// Creates all necessary indexes for the bank_credentials collection
    pub async fn create_indexes(&self) -> Result<(), InviteError> {
        use mongodb::options::{IndexOptions, CreateIndexOptions};
        use mongodb::{IndexModel, bson::doc};
        use futures::stream::TryStreamExt;

        // Check existing indexes to avoid conflicts
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
                tracing::debug!("Collection doesn't exist yet, will create all indexes");
                std::collections::HashSet::new()
            }
        };

        let mut indexes = Vec::new();

        // 1. Compound index on address + status + created_at for efficient latest lookup
        if !existing_index_names.contains("address_status_created_compound") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "address": 1, "status": 1, "created_at": -1 })
                .options(IndexOptions::builder()
                    .name("address_status_created_compound".to_string())
                    .build())
                .build());
        }

        // 2. Index on address for history lookup
        if !existing_index_names.contains("address_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "address": 1 })
                .options(IndexOptions::builder()
                    .name("address_index".to_string())
                    .build())
                .build());
        }

        // 3. Index on created_at for chronological queries
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
