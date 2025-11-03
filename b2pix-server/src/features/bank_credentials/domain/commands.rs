use crate::features::shared::StacksAddress;

#[derive(Debug, Clone)]
pub struct CreateBankCredentialsCommand {
    pub address: StacksAddress,
    pub client_id: String,
    pub secret_key: String,
    pub certificate_data: Vec<u8>,
    pub authorized_by: StacksAddress,
}

#[derive(Debug, Clone)]
pub struct RevokeBankCredentialsCommand {
    pub address: StacksAddress,
    pub authorized_by: StacksAddress,
}

#[derive(Debug, Clone)]
pub struct GetLatestBankCredentialsCommand {
    pub address: StacksAddress,
}
