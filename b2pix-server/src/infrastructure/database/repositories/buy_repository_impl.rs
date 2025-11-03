use async_trait::async_trait;
use mongodb::{Collection, Database};
use mongodb::bson::{doc};
use futures::stream::TryStreamExt;
use std::collections::HashSet;
use crate::features::buys::domain::entities::{Buy, BuyId, BuyStatus};
use crate::features::buys::ports::repositories::{BuyRepository};
use crate::features::advertisements::domain::entities::AdvertisementId;
use crate::features::shared::value_objects::{CryptoAddress};
use crate::common::errors::BuyError;

/// MongoDB implementation of the BuyRepository
pub struct BuyRepositoryImpl {
    collection: Collection<Buy>,
}

impl BuyRepositoryImpl {
    #[allow(dead_code)]
    pub fn new(database: &Database) -> Self {
        let collection = database.collection("buys");
        Self { collection }
    }

    /// Creates all necessary indexes for the buys collection
    pub async fn create_indexes(&self) -> Result<(), BuyError> {
        use mongodb::options::{IndexOptions, CreateIndexOptions};
        use mongodb::{IndexModel, bson::doc};
        use futures::stream::TryStreamExt;

        // Check existing indexes to avoid conflicts
        let existing_index_names = match self.collection.list_indexes(None).await {
            Ok(cursor) => {
                let index_models: Vec<IndexModel> = cursor.try_collect().await
                    .map_err(|e| BuyError::Repository(format!("Failed to collect indexes: {}", e)))?;
                
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
                tracing::debug!("Buys collection doesn't exist yet, will create all indexes");
                HashSet::new()
            }
        };

        let mut indexes = Vec::new();

        // 1. Partial unique index on advertisement_id + address_buy where is_final = false
        // This prevents multiple active buys for the same advertisement and buyer address
        if !existing_index_names.contains("advertisement_buyer_active_unique") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "advertisement_id": 1, "address_buy": 1 })
                .options(IndexOptions::builder()
                    .unique(true)
                    .partial_filter_expression(doc! { 
                        "is_final": false 
                    })
                    .name("advertisement_buyer_active_unique".to_string())
                    .build())
                .build());
        }

        // 2. Index on advertisement_id for finding buys by advertisement
        if !existing_index_names.contains("advertisement_id_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "advertisement_id": 1 })
                .options(IndexOptions::builder()
                    .name("advertisement_id_index".to_string())
                    .build())
                .build());
        }

        // 3. Index on address_buy for finding buys by buyer address
        if !existing_index_names.contains("address_buy_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "address_buy": 1 })
                .options(IndexOptions::builder()
                    .name("address_buy_index".to_string())
                    .build())
                .build());
        }

        // 4. Index on status for filtering by buy status
        if !existing_index_names.contains("status_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "status": 1 })
                .options(IndexOptions::builder()
                    .name("status_index".to_string())
                    .build())
                .build());
        }

        // 5. Index on is_final for filtering final/active buys
        if !existing_index_names.contains("is_final_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "is_final": 1 })
                .options(IndexOptions::builder()
                    .name("is_final_index".to_string())
                    .build())
                .build());
        }

        // 6. Index on expires_at for finding expiring buys
        if !existing_index_names.contains("expires_at_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "expires_at": 1 })
                .options(IndexOptions::builder()
                    .name("expires_at_index".to_string())
                    .build())
                .build());
        }

        // 7. Index on created_at for date range queries
        if !existing_index_names.contains("created_at_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "created_at": -1 })
                .options(IndexOptions::builder()
                    .name("created_at_index".to_string())
                    .build())
                .build());
        }

        // 8. Index on pix_key for finding buys by PIX key
        if !existing_index_names.contains("pix_key_index") {
            indexes.push(IndexModel::builder()
                .keys(doc! { "pix_key": 1 })
                .options(IndexOptions::builder()
                    .name("pix_key_index".to_string())
                    .build())
                .build());
        }

        // Create indexes if any are needed
        if !indexes.is_empty() {
            self.collection
            .create_indexes(indexes, CreateIndexOptions::builder().build())
            .await
            .map_err(|e| BuyError::Repository(format!("Failed to create indexes: {}", e)))?;
        }

        Ok(())
    }
}

#[async_trait]
impl BuyRepository for BuyRepositoryImpl {
    async fn save(&self, buy: &Buy) -> Result<(), BuyError> {
        let filter = doc! { "_id": buy.id.as_object_id() };
        
        match self.collection.replace_one(filter, buy, None).await? {
            result if result.matched_count > 0 => Ok(()),
            _ => {
                self.collection.insert_one(buy, None).await?;
                Ok(())
            }
        }
    }

       /// Expires a specific buy by ID if it's currently pending (database-level update)
    async fn expire(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! {
            "_id": id.as_object_id(),
            "status": "pending"
        };

        let update = doc! {
            "$set": {
                "status": "expired",
                "is_final": true,
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();

        let result = self.collection
            .find_one_and_update(filter, update, options)
            .await?;

        Ok(result)
    }

    /// Cancel a buy by ID and address if its status is "pending" (atomic operation)
    async fn cancel(&self, id: &BuyId, address_buy: &CryptoAddress) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! {
            "_id": id.as_object_id(),
            "address_buy": address_buy.as_str(),
            "status": "pending"
        };

        let update = doc! {
            "$set": {
                "status": "cancelled",
                "is_final": true,
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();

        let result = self.collection
            .find_one_and_update(filter, update, options)
            .await?;

        Ok(result)
    }

    async fn find_pending_older_than_minutes(&self, minutes: i64) -> Result<Vec<Buy>, BuyError> {
        let cutoff_time = chrono::Utc::now() - chrono::Duration::minutes(minutes);
        
        // Use simplified filter to avoid DateTime conversion issues
        let filter = doc! { "status": "pending" };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut buys = Vec::new();
        
        while let Some(buy) = cursor.try_next().await? {
            // Filter in Rust code instead of MongoDB query
            if buy.created_at < cutoff_time {
                buys.push(buy);
            }
        }
        
        Ok(buys)
    }

    /// Mark a buy as paid by ID with optional PIX transaction ID
    async fn mark_as_paid(&self, id: &BuyId, pix_id: Option<String>) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! { 
            "_id": id.as_object_id(),
            "status": "pending"
        };
        
        let mut update_doc = doc! { 
            "$set": { 
                "status": "paid",
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        // Add pix_id to the update if provided
        if let Some(pix_transaction_id) = pix_id {
            update_doc.get_document_mut("$set")
                .unwrap()
                .insert("pix_id", pix_transaction_id);
        }

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();
        
        let result = self.collection
            .find_one_and_update(filter, update_doc, options)
            .await?;
        
        Ok(result)
    }

    /// Mark a buy as dispute resolved seller
    async fn mark_as_dispute_resolved_seller(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! { 
            "_id": id.as_object_id(),
            "status": "dispute_favor_seller"
        };
        
        let update_doc = doc! { 
            "$set": { 
                "status": "dispute_resolved_seller",
                "is_final": true,
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();
        
        let result = self.collection
            .find_one_and_update(filter, update_doc, options)
            .await?;
        
        Ok(result)
    }

    async fn mark_as_dispute_resolved_buyer(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! { 
            "_id": id.as_object_id(),
            "status": "dispute_favor_buyer"
        };
        
        let update_doc = doc! { 
            "$set": { 
                "status": "dispute_resolved_buyer",
                "is_final": true,
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();
        
        let result = self.collection
            .find_one_and_update(filter, update_doc, options)
            .await?;
        
        Ok(result)
    }

    /// Increment pix verification attempts for a buy
    async fn increment_pix_verification_attempts(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! { 
            "_id": id.as_object_id()
        };
        
        let update_doc = doc! { 
            "$inc": { 
                "pix_verification_attempts": 1
            },
            "$set": {
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();
        
        let result = self.collection
            .find_one_and_update(filter, update_doc, options)
            .await?;
        
        Ok(result)
    }

    /// Mark a buy as payment confirmed
    async fn mark_as_payment_confirmed(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! { 
            "_id": id.as_object_id()
        };
        
        let update_doc = doc! { 
            "$set": { 
                "status": "payment_confirmed",
                "is_final": true,
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();
        
        let result = self.collection
            .find_one_and_update(filter, update_doc, options)
            .await?;
        
        Ok(result)
    }

    /// Mark a buy as in dispute
    async fn mark_as_in_dispute(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! { 
            "_id": id.as_object_id()
        };
        
        let update_doc = doc! { 
            "$set": { 
                "status": "in_dispute",
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();
        
        let result = self.collection
            .find_one_and_update(filter, update_doc, options)
            .await?;
        
        Ok(result)
    }

    /// Mark a buy as dispute favor buyer
    async fn mark_as_dispute_favor_buyer(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! { 
            "_id": id.as_object_id(),
            "status": "in_dispute"
        };
        
        let update_doc = doc! { 
            "$set": { 
                "status": "dispute_favor_buyer",
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();
        
        let result = self.collection
            .find_one_and_update(filter, update_doc, options)
            .await?;
        
        Ok(result)
    }

    /// Mark a buy as dispute favor seller
    async fn mark_as_dispute_favor_seller(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        use mongodb::options::FindOneAndUpdateOptions;
        use mongodb::options::ReturnDocument;

        let filter = doc! {
            "_id": id.as_object_id(),
            "status": "in_dispute"
        };

        let update_doc = doc! {
            "$set": {
                "status": "dispute_favor_seller",
                "updated_at": mongodb::bson::DateTime::now()
            }
        };

        let options = FindOneAndUpdateOptions::builder()
            .return_document(ReturnDocument::After)
            .build();

        let result = self.collection
            .find_one_and_update(filter, update_doc, options)
            .await?;

        Ok(result)
    }

    async fn find_by_id(&self, id: &BuyId) -> Result<Option<Buy>, BuyError> {
        let filter = doc! { "_id": id.as_object_id() };
        let result = self.collection.find_one(filter, None).await?;
        Ok(result)
    }

    async fn find_by_advertisement_id(&self, advertisement_id: &AdvertisementId) -> Result<Vec<Buy>, BuyError> {
        let filter = doc! { "advertisement_id": advertisement_id.as_object_id() };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut buys = Vec::new();
        
        while let Some(buy) = cursor.try_next().await? {
            buys.push(buy);
        }
        
        Ok(buys)
    }

    async fn find_by_buyer_address(&self, address: &CryptoAddress) -> Result<Vec<Buy>, BuyError> {
        let filter = doc! { "address_buy": address.as_str() };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut buys = Vec::new();

        while let Some(buy) = cursor.try_next().await? {
            buys.push(buy);
        }

        Ok(buys)
    }

    async fn find_by_buyer_address_paginated(
        &self,
        address: &CryptoAddress,
        skip: u64,
        limit: u64,
        sort_by: Option<String>,
        sort_order: Option<i32>,
    ) -> Result<Vec<Buy>, BuyError> {
        let sort_field = sort_by.unwrap_or_else(|| "created_at".to_string());
        let order = sort_order.unwrap_or(-1); // Default to descending

        let filter = doc! { "address_buy": address.as_str() };
        let options = mongodb::options::FindOptions::builder()
            .skip(skip)
            .limit(limit as i64)
            .sort(doc! { sort_field: order })
            .build();

        let mut cursor = self.collection.find(filter, options).await?;
        let mut buys = Vec::new();

        while let Some(buy) = cursor.try_next().await? {
            buys.push(buy);
        }

        Ok(buys)
    }

    async fn find_by_status(&self, status: &BuyStatus) -> Result<Vec<Buy>, BuyError> {
        let status_str = match status {
            BuyStatus::Pending => "pending",
            BuyStatus::Paid => "paid",
            BuyStatus::PaymentConfirmed => "payment_confirmed",
            // BuyStatus::Completed => "completed",
            BuyStatus::Cancelled => "cancelled",
            BuyStatus::Expired => "expired",
            BuyStatus::InDispute => "in_dispute",
            BuyStatus::DisputeFavorBuyer => "dispute_favor_buyer",
            BuyStatus::DisputeFavorSeller => "dispute_favor_seller",
            BuyStatus::DisputeResolvedBuyer => "dispute_resolved_buyer",
            BuyStatus::DisputeResolvedSeller => "dispute_resolved_seller",
        };
        
        let filter = doc! { "status": status_str };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut buys = Vec::new();
        
        while let Some(buy) = cursor.try_next().await? {
            buys.push(buy);
        }
        
        Ok(buys)
    }

    async fn find_paginated(
        &self,
        skip: u64,
        limit: u64,
        sort_by: Option<String>,
        sort_order: Option<i32>,
    ) -> Result<Vec<Buy>, BuyError> {
        let sort_field = sort_by.unwrap_or_else(|| "created_at".to_string());
        let order = sort_order.unwrap_or(-1); // Default to descending
        
        let options = mongodb::options::FindOptions::builder()
            .skip(skip)
            .limit(limit as i64)
            .sort(doc! { sort_field: order })
            .build();
            
        let mut cursor = self.collection.find(doc! {}, options).await?;
        let mut buys = Vec::new();
        
        while let Some(buy) = cursor.try_next().await? {
            buys.push(buy);
        }
        
        Ok(buys)
    }

}
