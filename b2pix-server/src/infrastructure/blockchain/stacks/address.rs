use secp256k1::{PublicKey, Secp256k1};
use ripemd::{Ripemd160, Digest};
use sha2::Sha256;
use anyhow::Result;
use std::str::FromStr;

/// Hash160: SHA256 then RIPEMD160
fn hash160(data: &[u8]) -> [u8; 20] {
    let sha256 = Sha256::digest(data);
    let ripemd = Ripemd160::digest(&sha256);
    let mut out = [0u8; 20];
    out.copy_from_slice(&ripemd);
    out
}

/// Convert a public key to a Stacks address (mainnet single-sig)
/// Based on official Stacks implementation:
/// Public Key -> hash160 -> checksum(version + hash160) -> c32(hash160 + checksum) -> prefix + c32
pub fn get_address_from_public_key(public_key: &str, network: &str) -> Result<String> {
    // Remove "0x" prefix if present and convert to bytes
    let clean_hex = public_key.strip_prefix("0x").unwrap_or(public_key);
    let public_key_bytes = hex::decode(clean_hex)
        .map_err(|_| anyhow::anyhow!("Invalid hex string"))?;
    if public_key_bytes.len() != 33 && public_key_bytes.len() != 65 {
        return Err(anyhow::anyhow!("Public key must be 33 bytes (compressed) or 65 bytes (uncompressed)"));
    }

    // Step 1: hash160 (SHA256 then RIPEMD160) - same as Bitcoin P2PKH
    let pubkey_hash160 = hash160(&public_key_bytes);

    // Step 2: Create address bytes for checksum calculation (version + hash160)
    let version_byte = match network {
        "mainnet" => 22u8,
        "testnet" => 26u8,
        _ => return Err(anyhow::anyhow!("Invalid network: {}", network)),
    };
    
    let mut address_bytes_for_checksum = Vec::with_capacity(1 + 20);
    address_bytes_for_checksum.push(version_byte);
    address_bytes_for_checksum.extend_from_slice(&pubkey_hash160);

    // Step 3: checksum (first 4 bytes of double SHA256 of version + hash160)
    let checksum = {
        let first = Sha256::digest(&address_bytes_for_checksum);
        let second = Sha256::digest(&first);
        let mut csum = [0u8; 4];
        csum.copy_from_slice(&second[0..4]);
        csum
    };

    // Step 4: Create final address bytes for C32 encoding: hash160 + checksum (no version byte)
    let mut address_bytes = Vec::with_capacity(20 + 4);
    address_bytes.extend_from_slice(&pubkey_hash160);
    address_bytes.extend_from_slice(&checksum);

    // Step 5: C32 encode
    let c32_addr = c32::encode(&address_bytes);

    // Step 6: Add prefix (SP for mainnet, ST for testnet)
    let prefix = match network {
        "mainnet" => "SP",
        "testnet" => "ST",
        _ => unreachable!(),
    };
    Ok(format!("{}{}", prefix, c32_addr))
}

/// Validate if a string is a valid public key format
pub fn is_valid_public_key(public_key: &str) -> bool {
    let _secp = Secp256k1::new();
    PublicKey::from_str(public_key).is_ok()
}

/// Validate if a string is a valid Stacks address format
pub fn is_valid_stacks_address(address: &str) -> bool {
    if !address.starts_with("SP") && !address.starts_with("ST") {
        return false;
    }
    let address_without_prefix = &address[2..];
    match c32::decode(address_without_prefix) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_public_key_validation() {
        assert!(is_valid_public_key("037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92"));
        assert!(!is_valid_public_key("invalid"));
    }
    
    #[test]
    fn test_address_validation() {
        assert!(is_valid_stacks_address("SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ"));
        assert!(!is_valid_stacks_address("invalid"));
    }
    
    #[test]
    fn test_address_derivation() {
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        
        match get_address_from_public_key(public_key, "mainnet") {
            Ok(address) => {
                println!("Generated address: {}", address);
                println!("Expected address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ");
                
                // Test with the official test case as well
                let test_pubkey = "040fadbbcea0ff3b05f03195b41cd991d7a0af8bd38559943aec99cbdaf0b22cc806b9a4f07579934774cc0c155e781d45c989f94336765e88a66d91cfb9f060b0";
                match get_address_from_public_key(test_pubkey, "mainnet") {
                    Ok(test_address) => {
                        println!("Test address for official test case: {}", test_address);
                    }
                    Err(e) => println!("Failed to generate test address: {}", e),
                }
                
                // Now the implementation should be correct
                assert_eq!(address, "SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ");
            }
            Err(e) => {
                println!("Failed to generate address: {}", e);
                panic!("Address generation failed");
            }
        }
    }
}
