use mongodb::{Client, Database, options::ClientOptions};

pub async fn init_mongo(mongo_uri: &str) -> anyhow::Result<Client> {
    let options = ClientOptions::parse(mongo_uri).await?;
    Ok(Client::with_options(options)?)
}

pub fn get_database(client: &Client, db_name: &str) -> Database {
    client.database(db_name)
}
