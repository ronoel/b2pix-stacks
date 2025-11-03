use serde::{Deserialize, Serialize};
use crate::features::shared::{Email, StacksAddress, Username};
use super::entities::InviteCode;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SendInviteCommand {
    pub email: Email,
    pub parent_id: StacksAddress,
    pub authorized_by: String, // public key que autorizou
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaimInviteCommand {
    pub code: InviteCode,
    pub username: Username,
    pub address: StacksAddress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockInviteCommand {
    pub code: InviteCode,
    pub authorized_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CancelInviteCommand {
    pub code: InviteCode,
    pub authorized_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetBankCredentialsCommand {
    pub address: String,
    pub client_id: String,
    pub secret_key: String,
    pub authorized_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetCertificateCommand {
    pub address: String,
    pub certificate_data: Vec<u8>,
    pub filename: String,
    pub authorized_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BankSetupCommand {
    pub address: String,
    pub client_id: String,
    pub secret_key: String,
    pub certificate_data: Vec<u8>, // PKCS#12 certificate data
    pub authorized_by: String,
}
