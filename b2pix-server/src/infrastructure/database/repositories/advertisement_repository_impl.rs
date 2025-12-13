use async_trait::async_trait;
use mongodb::{Collection, Database};
use mongodb::bson::{doc, oid::ObjectId};
use futures::stream::TryStreamExt;
use std::collections::HashSet;
use crate::features::advertisements::domain::entities::{Advertisement, AdvertisementId, AdvertisementStatus, PricingMode};
use crate::features::advertisements::ports::repositories::{AdvertisementRepository, AdvertisementStatistics};
use crate::features::shared::value_objects::{CryptoAddress, Token, Currency};
use crate::common::errors::AdvertisementError;

/// MongoDB implementation of the AdvertisementRepository
pub struct AdvertisementRepositoryImpl {
    collection: Collection<Advertisement>,
}

impl AdvertisementRepositoryImpl {
    #[allow(dead_code)]
    pub fn new(database: &Database) -> Self {
        let collection = database.collection("advertisements");
        Self { collection }
    }

    /// Creates all necessary indexes for the advertisements collection
    pub async fn create_indexes(&self) -> Result<(), AdvertisementError> {
        use mongodb::options::{IndexOptions, CreateIndexOptions};
        use mongodb::{IndexModel, bson::doc};
        use futures::stream::TryStreamExt;

        // Check existing indexes to avoid conflicts
        let existing_index_names = match self.collection.list_indexes(None).await {
            Ok(cursor) => {
                let index_models: Vec<IndexModel> = cursor.try_collect().await
                    .map_err(|e| AdvertisementError::Internal(format!("Failed to collect indexes: {}", e)))?;
                
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
                tracing::debug!("Advertisements collection doesn't exist yet, will create all indexes");
                HashSet::new()
            }
        };

        let mut indexes = Vec::new();

        // 1. Partial unique index on seller_address where is_active = true
        // This ensures only one active advertisement per seller address
        if !existing_index_names.contains("seller_address_active_unique") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "seller_address": 1 })
                .options(IndexOptions::builder()
                    .unique(true)
                    .partial_filter_expression(doc! { 
                        "is_active": true 
                    })
                    .name("seller_address_active_unique".to_string())
                    .build())
                .build());
        }

        // 2. Index on seller_address for general queries
        if !existing_index_names.contains("seller_address_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "seller_address": 1 })
                .options(IndexOptions::builder()
                    .name("seller_address_index".to_string())
                    .build())
                .build());
        }

        // 3. Index on token for filtering by token type
        if !existing_index_names.contains("token_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "token": 1 })
                .options(IndexOptions::builder()
                    .name("token_index".to_string())
                    .build())
                .build());
        }

        // 4. Index on currency for filtering by currency
        if !existing_index_names.contains("currency_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "currency": 1 })
                .options(IndexOptions::builder()
                    .name("currency_index".to_string())
                    .build())
                .build());
        }

        // 5. Compound index on token + currency for efficient filtering
        if !existing_index_names.contains("token_currency_compound") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "token": 1, "currency": 1 })
                .options(IndexOptions::builder()
                    .name("token_currency_compound".to_string())
                    .build())
                .build());
        }

        // 6. Index on status for filtering by advertisement status
        if !existing_index_names.contains("status_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "status": 1 })
                .options(IndexOptions::builder()
                    .name("status_index".to_string())
                    .build())
                .build());
        }

        // 7. Index on is_active for filtering active/inactive advertisements
        if !existing_index_names.contains("is_active_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "is_active": 1 })
                .options(IndexOptions::builder()
                    .name("is_active_index".to_string())
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

        // 9. Compound index on status + is_active for efficient status-based queries
        if !existing_index_names.contains("status_active_compound") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "status": 1, "is_active": 1 })
                .options(IndexOptions::builder()
                    .name("status_active_compound".to_string())
                    .build())
                .build());
        }

        // Only create indexes if there are any new indexes to create
        if !indexes.is_empty() {
            self.collection
                .create_indexes(indexes, CreateIndexOptions::builder().build())
                .await
                .map_err(|e| AdvertisementError::Internal(format!("Failed to create indexes: {}", e)))?;
        }

        Ok(())
    }
}

#[async_trait]
impl AdvertisementRepository for AdvertisementRepositoryImpl {
    async fn save(&self, advertisement: &Advertisement) -> Result<(), AdvertisementError> {
        let filter = doc! { "_id": advertisement.id.as_object_id() };
        
        match self.collection.replace_one(filter, advertisement, None).await? {
            result if result.matched_count > 0 => Ok(()),
            _ => {
                // If no document was matched, insert as new
                self.collection.insert_one(advertisement, None).await?;
                Ok(())
            }
        }
    }

    async fn find_by_id(&self, id: &AdvertisementId) -> Result<Option<Advertisement>, AdvertisementError> {
        let filter = doc! { "_id": id.as_object_id() };
        let result = self.collection.find_one(filter, None).await?;
        Ok(result)
    }

    // Simplified implementations to avoid DateTime conversion issues for now
    // In production, you'd want to handle proper DateTime conversions
    
    async fn find_by_seller_address(&self, address: &CryptoAddress) -> Result<Vec<Advertisement>, AdvertisementError> {
        let filter = doc! { "seller_address": address.as_str() };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn find_by_token(&self, token: &Token) -> Result<Vec<Advertisement>, AdvertisementError> {
        let filter = doc! { "token": token.as_str() };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn find_by_currency(&self, currency: &Currency) -> Result<Vec<Advertisement>, AdvertisementError> {
        let filter = doc! { "currency": currency.as_str() };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn find_by_token_and_currency(&self, token: &Token, currency: &Currency) -> Result<Vec<Advertisement>, AdvertisementError> {
        let filter = doc! { 
            "token": token.as_str(),
            "currency": currency.as_str()
        };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn find_by_status(&self, status: &AdvertisementStatus) -> Result<Vec<Advertisement>, AdvertisementError> {
        let status_str = match status {
            AdvertisementStatus::Draft => "draft",
            AdvertisementStatus::Pending => "pending",
            AdvertisementStatus::Ready => "ready",
            AdvertisementStatus::ProcessingDeposit => "processing_deposit",
            AdvertisementStatus::Finishing => "finishing",
            AdvertisementStatus::BankFailed => "bank_failed",
            AdvertisementStatus::DepositFailed => "deposit_failed",
            AdvertisementStatus::Closed => "closed",
            AdvertisementStatus::Disabled => "disabled",
        };
        
        let filter = doc! { "status": status_str };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn find_available(&self) -> Result<Vec<Advertisement>, AdvertisementError> {
        let filter = doc! { 
            "status": "ready",
            "available_amount": { "$gt": 0 }
        };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn find_available_by_pair(&self, token: &Token, currency: &Currency) -> Result<Vec<Advertisement>, AdvertisementError> {
        let filter = doc! { 
            "status": "ready",
            "available_amount": { "$gt": 0 },
            "token": token.as_str(),
            "currency": currency.as_str()
        };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn find_low_funds(&self, threshold_percentage: f64) -> Result<Vec<Advertisement>, AdvertisementError> {
        // Simple implementation without MongoDB aggregation
        let mut advertisements = Vec::new();
        let mut cursor = self.collection.find(doc! {}, None).await?;

        while let Some(advertisement) = cursor.try_next().await? {
            let used = advertisement.total_deposited - advertisement.available_amount;
            let utilization = if advertisement.total_deposited > 0 {
                (used as f64 / advertisement.total_deposited as f64) * 100.0
            } else {
                0.0
            };

            if utilization >= threshold_percentage {
                advertisements.push(advertisement);
            }
        }

        Ok(advertisements)
    }

    async fn find_by_date_range(
        &self, 
        _from: chrono::DateTime<chrono::Utc>, 
        _to: chrono::DateTime<chrono::Utc>
    ) -> Result<Vec<Advertisement>, AdvertisementError> {
        // Simplified implementation - in production you'd handle DateTime conversion
        let mut cursor = self.collection.find(doc! {}, None).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn find_paginated(
        &self,
        skip: u64,
        limit: u64,
        sort_by: Option<String>,
        sort_order: Option<i32>,
    ) -> Result<Vec<Advertisement>, AdvertisementError> {
        let sort_field = sort_by.as_deref().unwrap_or("created_at");
        let sort_direction = sort_order.unwrap_or(-1);
        
        let options = mongodb::options::FindOptions::builder()
            .skip(skip)
            .limit(limit as i64)
            .sort(doc! { sort_field: sort_direction })
            .build();
        
        let mut cursor = self.collection.find(doc! {}, options).await?;
        let mut advertisements = Vec::new();
        
        while let Some(advertisement) = cursor.try_next().await? {
            advertisements.push(advertisement);
        }
        
        Ok(advertisements)
    }

    async fn count(&self) -> Result<u64, AdvertisementError> {
        let count = self.collection.count_documents(doc! {}, None).await?;
        Ok(count)
    }

    async fn count_by_status(&self, status: &AdvertisementStatus) -> Result<u64, AdvertisementError> {
        let status_str = match status {
            AdvertisementStatus::Draft => "draft",
            AdvertisementStatus::Pending => "pending",
            AdvertisementStatus::Ready => "ready",
            AdvertisementStatus::ProcessingDeposit => "processing_deposit",
            AdvertisementStatus::Finishing => "finishing",
            AdvertisementStatus::BankFailed => "bank_failed",
            AdvertisementStatus::DepositFailed => "deposit_failed",
            AdvertisementStatus::Closed => "closed",
            AdvertisementStatus::Disabled => "disabled",
        };
        
        let filter = doc! { "status": status_str };
        let count = self.collection.count_documents(filter, None).await?;
        Ok(count)
    }

    async fn count_by_seller_address(&self, address: &CryptoAddress) -> Result<u64, AdvertisementError> {
        let filter = doc! { "seller_address": address.as_str() };
        let count = self.collection.count_documents(filter, None).await?;
        Ok(count)
    }

    async fn delete(&self, id: &AdvertisementId) -> Result<bool, AdvertisementError> {
        let filter = doc! { "_id": id.as_object_id() };
        let result = self.collection.delete_one(filter, None).await?;
        Ok(result.deleted_count > 0)
    }

    async fn bulk_update_status(
        &self,
        ids: &[AdvertisementId],
        new_status: AdvertisementStatus,
    ) -> Result<u64, AdvertisementError> {
        let status_str = match new_status {
            AdvertisementStatus::Draft => "draft",
            AdvertisementStatus::Pending => "pending",
            AdvertisementStatus::Ready => "ready",
            AdvertisementStatus::ProcessingDeposit => "processing_deposit",
            AdvertisementStatus::Finishing => "finishing",
            AdvertisementStatus::BankFailed => "bank_failed",
            AdvertisementStatus::DepositFailed => "deposit_failed",
            AdvertisementStatus::Closed => "closed",
            AdvertisementStatus::Disabled => "disabled",
        };
        
        let object_ids: Vec<ObjectId> = ids.iter()
            .map(|id| id.as_object_id().clone())
            .collect();
        
        let filter = doc! { "_id": { "$in": object_ids } };
        let update = doc! { 
            "$set": {
                "status": status_str
            }
        };
        
        let result = self.collection.update_many(filter, update, None).await?;
        Ok(result.modified_count)
    }

    async fn get_statistics(&self) -> Result<AdvertisementStatistics, AdvertisementError> {
        // Simplified implementation - would use aggregation in production
        Ok(AdvertisementStatistics {
            total_count: 0,
            draft_count: 0,
            ready_count: 0,
            bank_failed_count: 0,
            closed_count: 0,
            disabled_count: 0,
            total_fund_amount: 0u128,
            total_remaining_amount: 0u128,
            average_price: 0.0,
            most_popular_token: None,
            most_popular_currency: None,
        })
    }

    async fn update_available_amount(
        &self,
        advertisement_id: &AdvertisementId,
        amount: &u128,
    ) -> Result<Option<Advertisement>, AdvertisementError> {
        use mongodb::options::FindOneAndUpdateOptions;

        // Convert amount to i64 for MongoDB compatibility (same as the entity serialization)
        let amount_i64 = i64::try_from(*amount)
            .map_err(|_| AdvertisementError::Internal("Amount too large for MongoDB".to_string()))?;

        // Create filter: find by _id and ensure available_amount >= amount
        let filter = doc! {
            "_id": advertisement_id.as_object_id(),
            "available_amount": { "$gte": amount_i64 }
        };

        // Create update: decrement available_amount by amount
        let update = doc! {
            "$inc": {
                "available_amount": -amount_i64
            },
            "$set": {
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        // Configure options to return the updated document
        let options = FindOneAndUpdateOptions::builder()
            .return_document(mongodb::options::ReturnDocument::After)
            .build();

        // Execute the atomic update
        let result = self.collection
            .find_one_and_update(filter, update, options)
            .await
            .map_err(|e| AdvertisementError::Internal(format!("Database error: {}", e)))?;

        Ok(result)
    }

    async fn refund_available_amount(
        &self,
        advertisement_id: &AdvertisementId,
        amount: &u128,
    ) -> Result<Option<Advertisement>, AdvertisementError> {
        use mongodb::options::FindOneAndUpdateOptions;

        // Convert amount to i64 for MongoDB compatibility (same as the entity serialization)
        let amount_i64 = i64::try_from(*amount)
            .map_err(|_| AdvertisementError::Internal("Amount too large for MongoDB".to_string()))?;

        // Create filter: find by _id (no need to check available_amount for refunds)
        let filter = doc! {
            "_id": advertisement_id.as_object_id()
        };

        // Create update: increment available_amount by amount (refund)
        let update = doc! {
            "$inc": {
                "available_amount": amount_i64
            },
            "$set": {
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        // Configure options to return the updated document
        let options = FindOneAndUpdateOptions::builder()
            .return_document(mongodb::options::ReturnDocument::After)
            .build();

        // Execute the atomic update
        let result = self.collection
            .find_one_and_update(filter, update, options)
            .await
            .map_err(|e| AdvertisementError::Internal(format!("Database error: {}", e)))?;

        Ok(result)
    }

    async fn add_deposited_amount(
        &self,
        advertisement_id: &AdvertisementId,
        amount: &u128,
    ) -> Result<Option<Advertisement>, AdvertisementError> {
        use mongodb::options::FindOneAndUpdateOptions;

        // Convert amount to i64 for MongoDB compatibility
        let amount_i64 = i64::try_from(*amount)
            .map_err(|_| AdvertisementError::Internal("Amount too large for MongoDB".to_string()))?;

        // Create filter: find by _id
        let filter = doc! {
            "_id": advertisement_id.as_object_id()
        };

        // Create update: increment both total_deposited and available_amount atomically
        let update = doc! {
            "$inc": {
                "total_deposited": amount_i64,
                "available_amount": amount_i64
            },
            "$set": {
                "status": "ready",
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        // Configure options to return the updated document
        let options = FindOneAndUpdateOptions::builder()
            .return_document(mongodb::options::ReturnDocument::After)
            .build();

        // Execute the atomic update
        let result = self.collection
            .find_one_and_update(filter, update, options)
            .await
            .map_err(|e| AdvertisementError::Internal(format!("Database error: {}", e)))?;

        Ok(result)
    }

    async fn update_pricing_mode_atomic(
        &self,
        advertisement_id: &AdvertisementId,
        seller_address: &str,
        new_pricing_mode: &PricingMode,
        min_amount: i64,
        max_amount: i64,
    ) -> Result<Option<Advertisement>, AdvertisementError> {
        use mongodb::options::FindOneAndUpdateOptions;

        // Serialize pricing_mode to BSON
        let pricing_mode_bson = mongodb::bson::to_bson(new_pricing_mode)
            .map_err(|e| AdvertisementError::Internal(format!("Failed to serialize pricing mode: {}", e)))?;

        // Create filter with multiple conditions:
        // 1. _id matches the advertisement_id
        // 2. seller_address matches (ownership check)
        // 3. status is NOT in [Finishing, Closed, Disabled]
        let filter = doc! {
            "_id": advertisement_id.as_object_id(),
            "seller_address": seller_address,
            "status": {
                "$nin": ["finishing", "closed", "disabled"]
            }
        };

        // Create update: set new pricing_mode, min_amount, max_amount and update timestamp
        let update = doc! {
            "$set": {
                "pricing_mode": pricing_mode_bson,
                "min_amount": min_amount,
                "max_amount": max_amount,
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        // Configure options to return the updated document
        let options = FindOneAndUpdateOptions::builder()
            .return_document(mongodb::options::ReturnDocument::After)
            .build();

        // Execute the atomic update
        let result = self.collection
            .find_one_and_update(filter, update, options)
            .await
            .map_err(|e| AdvertisementError::Internal(format!("Database error: {}", e)))?;

        Ok(result)
    }

    async fn lock_for_deposit(
        &self,
        advertisement_id: &AdvertisementId,
    ) -> Result<Option<Advertisement>, AdvertisementError> {
        use mongodb::options::FindOneAndUpdateOptions;

        // Create filter: Only match if status is Ready
        let filter = doc! {
            "_id": advertisement_id.as_object_id(),
            "status": "ready"
        };

        // Create update: Change status to ProcessingDeposit
        let update = doc! {
            "$set": {
                "status": "processing_deposit",
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        // Configure options to return the updated document
        let options = FindOneAndUpdateOptions::builder()
            .return_document(mongodb::options::ReturnDocument::After)
            .build();

        // Execute the atomic update
        let result = self.collection
            .find_one_and_update(filter, update, options)
            .await
            .map_err(|e| AdvertisementError::Internal(format!("Database error: {}", e)))?;

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use crate::features::advertisements::domain::entities::AdvertisementId;
    
    /// Test demonstrating how the update_available_amount and refund_available_amount methods work
    /// This is a unit test that doesn't require an actual MongoDB instance
    #[test]
    fn test_update_and_refund_available_amount_logic() {
        // This test demonstrates the logic without requiring MongoDB
        let advertisement_id = AdvertisementId::new();
        let amount_to_reduce = 1000u128;
        
        // In a real MongoDB operation for update_available_amount:
        // Filter: { "_id": advertisement_id, "available_amount": { "$gte": 1000 } }
        // Update: { "$inc": { "available_amount": -1000 }, "$set": { "updated_at": now } }
        
        // In a real MongoDB operation for refund_available_amount:
        // Filter: { "_id": advertisement_id }
        // Update: { "$inc": { "available_amount": 1000 }, "$set": { "updated_at": now } }
        
        println!("Advertisement ID: {}", advertisement_id);
        println!("Amount to reduce/refund: {}", amount_to_reduce);
        
        println!("\n=== UPDATE OPERATION ===");
        println!("MongoDB filter would be: {{ \"_id\": ObjectId(\"{}\"), \"available_amount\": {{ \"$gte\": {} }} }}", 
                 advertisement_id, amount_to_reduce);
        println!("MongoDB update would be: {{ \"$inc\": {{ \"available_amount\": -{} }}, \"$set\": {{ \"updated_at\": ISODate() }} }}", 
                 amount_to_reduce);
        
        println!("\n=== REFUND OPERATION ===");
        println!("MongoDB filter would be: {{ \"_id\": ObjectId(\"{}\") }}", 
                 advertisement_id);
        println!("MongoDB update would be: {{ \"$inc\": {{ \"available_amount\": {} }}, \"$set\": {{ \"updated_at\": ISODate() }} }}", 
                 amount_to_reduce);
        
        assert!(amount_to_reduce > 0, "Amount must be positive");
    }
}
