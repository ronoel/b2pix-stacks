use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    pub mongodb_uri: String,
    pub database_name: String,
    pub server_port: u16,
    pub aws_access_key_id: String,
    pub aws_secret_access_key: String,
    pub aws_region: String,
    pub from_email: String,
    pub from_name: String,
    #[serde(default)]
    pub production_mode: bool,
    pub network: String,
    pub address_manager: String,
    pub trello_api_key: String,
    pub trello_token: String,
    pub trello_list_id: String,
    pub b2pix_api_key: String,
}

impl Config {
    pub fn from_env() -> Result<Self, config::ConfigError> {
        dotenvy::dotenv().ok();
        let cfg = config::Config::builder()
            .add_source(config::Environment::default().separator("__"))
            .build()?;
        cfg.try_deserialize()
    }
} 