use async_trait::async_trait;
use futures::stream::TryStreamExt;
use mongodb::{bson::doc, Collection, Database};

use crate::common::errors::AdvertisementDepositError;
use crate::features::advertisement_deposits::domain::entities::{
    AdvertisementDeposit, AdvertisementDepositId, AdvertisementDepositStatus,
};
use crate::features::advertisement_deposits::ports::repositories::AdvertisementDepositRepository;
use crate::features::advertisements::domain::entities::AdvertisementId;

/// MongoDB implementation of the AdvertisementDepositRepository
pub struct AdvertisementDepositRepositoryImpl {
    collection: Collection<AdvertisementDeposit>,
}

impl AdvertisementDepositRepositoryImpl {
    pub fn new(database: &Database) -> Self {
        let collection = database.collection("advertisement_deposits");
        Self { collection }
    }

    /// Creates necessary indexes for the advertisement_deposits collection
    pub async fn create_indexes(&self) -> Result<(), AdvertisementDepositError> {
        use mongodb::options::{CreateIndexOptions, IndexOptions};
        use mongodb::IndexModel;

        let indexes = vec![
            // Index on advertisement_id for finding all deposits for an advertisement
            IndexModel::builder()
                .keys(doc! { "advertisement_id": 1 })
                .options(
                    IndexOptions::builder()
                        .name("advertisement_id_index".to_string())
                        .build(),
                )
                .build(),
            // Compound index on advertisement_id + created_at (DESC) for listing deposits
            // This index is optimized for the GET /:id/deposits endpoint
            IndexModel::builder()
                .keys(doc! { "advertisement_id": 1, "created_at": -1 })
                .options(
                    IndexOptions::builder()
                        .name("advertisement_created_compound".to_string())
                        .build(),
                )
                .build(),
            // Index on status for finding deposits by status
            IndexModel::builder()
                .keys(doc! { "status": 1 })
                .options(
                    IndexOptions::builder()
                        .name("status_index".to_string())
                        .build(),
                )
                .build(),
            // Compound index on advertisement_id + status for efficient queries
            IndexModel::builder()
                .keys(doc! { "advertisement_id": 1, "status": 1 })
                .options(
                    IndexOptions::builder()
                        .name("advertisement_status_compound".to_string())
                        .build(),
                )
                .build(),
            // Index on transaction_id for lookups
            IndexModel::builder()
                .keys(doc! { "transaction_id": 1 })
                .options(
                    IndexOptions::builder()
                        .name("transaction_id_index".to_string())
                        .sparse(true) // transaction_id is optional
                        .build(),
                )
                .build(),
            // Index on created_at for chronological queries
            IndexModel::builder()
                .keys(doc! { "created_at": -1 })
                .options(
                    IndexOptions::builder()
                        .name("created_at_desc".to_string())
                        .build(),
                )
                .build(),
        ];

        self.collection
            .create_indexes(indexes, CreateIndexOptions::builder().build())
            .await
            .map_err(|e| {
                AdvertisementDepositError::Internal(format!("Failed to create indexes: {}", e))
            })?;

        Ok(())
    }
}

#[async_trait]
impl AdvertisementDepositRepository for AdvertisementDepositRepositoryImpl {
    async fn save(&self, deposit: &AdvertisementDeposit) -> Result<(), AdvertisementDepositError> {
        let filter = doc! { "_id": deposit.id.as_object_id() };

        match self
            .collection
            .replace_one(filter, deposit, None)
            .await?
        {
            result if result.matched_count > 0 => Ok(()),
            _ => {
                // If no document was matched, insert as new
                self.collection.insert_one(deposit, None).await?;
                Ok(())
            }
        }
    }

    async fn find_by_id(
        &self,
        id: &AdvertisementDepositId,
    ) -> Result<Option<AdvertisementDeposit>, AdvertisementDepositError> {
        let filter = doc! { "_id": id.as_object_id() };
        let result = self.collection.find_one(filter, None).await?;
        Ok(result)
    }

    async fn find_by_advertisement_id(
        &self,
        advertisement_id: &AdvertisementId,
    ) -> Result<Vec<AdvertisementDeposit>, AdvertisementDepositError> {
        use mongodb::options::FindOptions;

        let filter = doc! { "advertisement_id": advertisement_id.as_object_id() };

        // Sort by created_at descending (newest first)
        let options = FindOptions::builder()
            .sort(doc! { "created_at": -1 })
            .build();

        let mut cursor = self.collection.find(filter, options).await?;
        let mut deposits = Vec::new();

        while let Some(deposit) = cursor.try_next().await? {
            deposits.push(deposit);
        }

        Ok(deposits)
    }

    async fn find_by_status(
        &self,
        status: &AdvertisementDepositStatus,
    ) -> Result<Vec<AdvertisementDeposit>, AdvertisementDepositError> {
        let status_str = match status {
            AdvertisementDepositStatus::Draft => "draft",
            AdvertisementDepositStatus::Pending => "pending",
            AdvertisementDepositStatus::Confirmed => "confirmed",
            AdvertisementDepositStatus::Failed => "failed",
        };

        let filter = doc! { "status": status_str };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut deposits = Vec::new();

        while let Some(deposit) = cursor.try_next().await? {
            deposits.push(deposit);
        }

        Ok(deposits)
    }

    async fn find_pending_by_advertisement_id(
        &self,
        advertisement_id: &AdvertisementId,
    ) -> Result<Vec<AdvertisementDeposit>, AdvertisementDepositError> {
        let filter = doc! {
            "advertisement_id": advertisement_id.as_object_id(),
            "status": "pending"
        };
        let mut cursor = self.collection.find(filter, None).await?;
        let mut deposits = Vec::new();

        while let Some(deposit) = cursor.try_next().await? {
            deposits.push(deposit);
        }

        Ok(deposits)
    }

    async fn count_by_advertisement_id(
        &self,
        advertisement_id: &AdvertisementId,
    ) -> Result<u64, AdvertisementDepositError> {
        let filter = doc! { "advertisement_id": advertisement_id.as_object_id() };
        let count = self.collection.count_documents(filter, None).await?;
        Ok(count)
    }

    async fn delete(
        &self,
        id: &AdvertisementDepositId,
    ) -> Result<bool, AdvertisementDepositError> {
        let filter = doc! { "_id": id.as_object_id() };
        let result = self.collection.delete_one(filter, None).await?;
        Ok(result.deleted_count > 0)
    }
}
