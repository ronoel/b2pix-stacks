use async_trait::async_trait;
use mongodb::{Database, Collection, bson::doc};
use mongodb::bson::oid::ObjectId;
use mongodb::options::{IndexOptions, CreateIndexOptions};
use mongodb::IndexModel;
use futures::stream::TryStreamExt;
use chrono::DateTime;
use serde::{Serialize, Deserialize};
use std::collections::HashSet;

use crate::features::payment_requests::domain::entities::{PaymentRequest, PaymentRequestId, PaymentStatus, SourceType};
use crate::features::payment_requests::ports::{PaymentRequestRepository, PaymentRequestError};

#[derive(Debug, Serialize, Deserialize)]
struct PaymentRequestDocument {
    pub id: String,
    pub source_type: String,
    pub source_id: ObjectId,
    pub receiver_address: String,
    pub amount: u64,
    pub description: String,
    pub status: String,
    pub is_active: bool,
    pub blockchain_tx_id: Option<String>,
    pub failure_reason: Option<String>,
    pub attempt_automatic_payment: bool,
    pub created_at: mongodb::bson::DateTime,
    pub updated_at: mongodb::bson::DateTime,
}

impl From<&PaymentRequest> for PaymentRequestDocument {
    fn from(payment_request: &PaymentRequest) -> Self {
        // Determine if this payment request is "active" based on status
        let is_active = matches!(
            payment_request.status(),
            PaymentStatus::PendingAutomaticPayment | PaymentStatus::Waiting |
            PaymentStatus::Processing | PaymentStatus::Broadcast | PaymentStatus::Confirmed
        );
        
        Self {
            id: payment_request.id().as_str().to_string(),
            source_type: payment_request.source_type().to_string(),
            source_id: payment_request.source_id().clone(),
            receiver_address: payment_request.receiver_address().to_string(),
            amount: payment_request.amount(),
            description: payment_request.description.clone(),
            status: payment_request.status().to_string(),
            is_active,
            blockchain_tx_id: payment_request.blockchain_tx_id().clone(),
            failure_reason: payment_request.failure_reason().clone(),
            attempt_automatic_payment: payment_request.attempt_automatic_payment(),
            created_at: mongodb::bson::DateTime::from_millis(payment_request.created_at().timestamp_millis()),
            updated_at: mongodb::bson::DateTime::from_millis(payment_request.updated_at().timestamp_millis()),
        }
    }
}

impl TryFrom<PaymentRequestDocument> for PaymentRequest {
    type Error = PaymentRequestError;

    fn try_from(doc: PaymentRequestDocument) -> Result<Self, Self::Error> {
        let created_at = DateTime::from_timestamp_millis(doc.created_at.timestamp_millis())
            .ok_or_else(|| PaymentRequestError::Internal("Invalid created_at timestamp".to_string()))?;

        let updated_at = DateTime::from_timestamp_millis(doc.updated_at.timestamp_millis())
            .ok_or_else(|| PaymentRequestError::Internal("Invalid updated_at timestamp".to_string()))?;

        let status = PaymentStatus::from_string(&doc.status)
            .map_err(|e| PaymentRequestError::Internal(e))?;

        let source_type = SourceType::from_string(&doc.source_type)
            .map_err(|e| PaymentRequestError::Internal(e))?;

        Ok(PaymentRequest {
            id: PaymentRequestId::from_string(doc.id),
            source_type,
            source_id: doc.source_id,
            receiver_address: doc.receiver_address,
            amount: doc.amount,
            description: doc.description,
            status,
            blockchain_tx_id: doc.blockchain_tx_id,
            failure_reason: doc.failure_reason,
            attempt_automatic_payment: doc.attempt_automatic_payment,
            created_at,
            updated_at,
        })
    }
}

pub struct PaymentRequestRepositoryImpl {
    collection: Collection<PaymentRequestDocument>,
}

impl PaymentRequestRepositoryImpl {
    pub fn new(database: &Database) -> Self {
        let collection = database.collection::<PaymentRequestDocument>("payment_requests");
        Self { collection }
    }

    /// Creates all necessary indexes for the payment_requests collection
    pub async fn create_indexes(&self) -> Result<(), PaymentRequestError> {
        // Check existing indexes to avoid conflicts
        let existing_index_names = match self.collection.list_indexes(None).await {
            Ok(cursor) => {
                let index_models: Vec<IndexModel> = cursor.try_collect().await
                    .map_err(|e| PaymentRequestError::Internal(format!("Failed to collect indexes: {}", e)))?;
                
                let mut names = HashSet::new();
                for index_model in index_models {
                    if let Some(name) = index_model.options.as_ref().and_then(|opts| opts.name.as_ref()) {
                        names.insert(name.clone());
                    }
                }
                names
            },
            Err(_) => {
                // Collection doesn't exist yet, so no indexes exist
                tracing::debug!("Payment requests collection doesn't exist yet, will create all indexes");
                HashSet::new()
            }
        };

        let mut indexes = Vec::new();

        // Unique partial index on source_id for active payment requests
        // This ensures only ONE active payment request per source_id
        // Active = status is waiting, processing, broadcast, or confirmed (is_active=true)
        if !existing_index_names.contains("unique_source_id_active") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "source_id": 1 })
                .options(IndexOptions::builder()
                    .name("unique_source_id_active".to_string())
                    .unique(true)
                    .partial_filter_expression(doc! {
                        "is_active": true
                    })
                    .build())
                .build());
        }

        // Index on status for filtering by status
        if !existing_index_names.contains("status_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "status": 1 })
                .options(IndexOptions::builder()
                    .name("status_index".to_string())
                    .build())
                .build());
        }

        // Compound index on source_type + source_id for find_by_source queries
        if !existing_index_names.contains("source_compound") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "source_type": 1, "source_id": 1 })
                .options(IndexOptions::builder()
                    .name("source_compound".to_string())
                    .build())
                .build());
        }

        // Index on created_at for chronological queries and sorting
        if !existing_index_names.contains("created_at_desc") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "created_at": -1 })
                .options(IndexOptions::builder()
                    .name("created_at_desc".to_string())
                    .build())
                .build());
        }

        // Only create indexes if there are any new indexes to create
        if !indexes.is_empty() {
            self.collection
                .create_indexes(indexes, CreateIndexOptions::builder().build())
                .await
                .map_err(|e| PaymentRequestError::Internal(format!("Failed to create indexes: {}", e)))?;
        }

        Ok(())
    }
}

#[async_trait]
impl PaymentRequestRepository for PaymentRequestRepositoryImpl {
    async fn save(&self, payment_request: &PaymentRequest) -> Result<(), PaymentRequestError> {
        let doc = PaymentRequestDocument::from(payment_request);
        let filter = doc! { "id": &doc.id };

        self.collection
            .replace_one(filter, &doc, mongodb::options::ReplaceOptions::builder().upsert(true).build())
            .await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to save payment request: {}", e)))?;

        Ok(())
    }

    async fn find_by_id(&self, id: &PaymentRequestId) -> Result<Option<PaymentRequest>, PaymentRequestError> {
        let filter = doc! { "id": id.as_str() };

        if let Some(doc) = self.collection.find_one(filter, None).await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to find payment request: {}", e)))? {
            Ok(Some(doc.try_into()?))
        } else {
            Ok(None)
        }
    }

    async fn find_by_status(&self, status: &PaymentStatus) -> Result<Vec<PaymentRequest>, PaymentRequestError> {
        let filter = doc! { "status": status.to_string() };

        let cursor = self.collection.find(filter, None).await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to query payment requests: {}", e)))?;

        let docs: Vec<PaymentRequestDocument> = cursor.try_collect().await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to collect payment requests: {}", e)))?;

        docs.into_iter()
            .map(|doc| doc.try_into())
            .collect()
    }

    async fn list(
        &self,
        page: u64,
        limit: u64,
        status_filter: Option<Vec<PaymentStatus>>,
        sort_order: &str,
    ) -> Result<Vec<PaymentRequest>, PaymentRequestError> {
        let skip = (page - 1) * limit;

        // Build filter
        let mut filter = doc! {};
        if let Some(statuses) = status_filter {
            let status_strings: Vec<String> = statuses.iter().map(|s| s.to_string()).collect();
            filter.insert("status", doc! { "$in": status_strings });
        }

        // Build sort options
        let sort_direction = if sort_order == "asc" { 1 } else { -1 };
        let sort = doc! { "created_at": sort_direction };

        let options = mongodb::options::FindOptions::builder()
            .skip(skip)
            .limit(limit as i64)
            .sort(sort)
            .build();

        let cursor = self.collection.find(filter, options).await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to query payment requests: {}", e)))?;

        let docs: Vec<PaymentRequestDocument> = cursor.try_collect().await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to collect payment requests: {}", e)))?;

        docs.into_iter()
            .map(|doc| doc.try_into())
            .collect()
    }

    async fn count(
        &self,
        status_filter: Option<Vec<PaymentStatus>>,
    ) -> Result<u64, PaymentRequestError> {
        let mut filter = doc! {};
        if let Some(statuses) = status_filter {
            let status_strings: Vec<String> = statuses.iter().map(|s| s.to_string()).collect();
            filter.insert("status", doc! { "$in": status_strings });
        }

        self.collection.count_documents(filter, None).await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to count payment requests: {}", e)))
    }

    async fn update_status_atomic(
        &self,
        id: &PaymentRequestId,
        allowed_statuses: Vec<PaymentStatus>,
        new_status: PaymentStatus,
    ) -> Result<Option<PaymentRequest>, PaymentRequestError> {
        let allowed_status_strings: Vec<String> = allowed_statuses.iter().map(|s| s.to_string()).collect();

        // Calculate is_active based on the new status
        let is_active = matches!(
            new_status,
            PaymentStatus::PendingAutomaticPayment | PaymentStatus::Waiting |
            PaymentStatus::Processing | PaymentStatus::Broadcast | PaymentStatus::Confirmed
        );

        // Build atomic query - only update if status is in allowed list
        let filter = doc! {
            "id": id.as_str(),
            "status": { "$in": allowed_status_strings }
        };

        let update = doc! {
            "$set": {
                "status": new_status.to_string(),
                "is_active": is_active,
                "updated_at": mongodb::bson::DateTime::from_millis(chrono::Utc::now().timestamp_millis())
            }
        };

        let options = mongodb::options::FindOneAndUpdateOptions::builder()
            .return_document(mongodb::options::ReturnDocument::After)
            .build();

        match self.collection.find_one_and_update(filter, update, options).await {
            Ok(Some(doc)) => Ok(Some(doc.try_into()?)),
            Ok(None) => Ok(None),
            Err(e) => Err(PaymentRequestError::Internal(format!("Failed to update payment request status: {}", e)))
        }
    }

    async fn find_by_source(
        &self,
        source_type: &SourceType,
        source_id: &ObjectId,
    ) -> Result<Vec<PaymentRequest>, PaymentRequestError> {
        let filter = doc! {
            "source_type": source_type.to_string(),
            "source_id": source_id
        };

        let sort = doc! { "created_at": -1 };

        let options = mongodb::options::FindOptions::builder()
            .sort(sort)
            .build();

        let cursor = self.collection.find(filter, options).await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to query payment requests by source: {}", e)))?;

        let docs: Vec<PaymentRequestDocument> = cursor.try_collect().await
            .map_err(|e| PaymentRequestError::Internal(format!("Failed to collect payment requests: {}", e)))?;

        docs.into_iter()
            .map(|doc| doc.try_into())
            .collect()
    }
}
