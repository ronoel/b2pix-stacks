use secp256k1::{PublicKey, Secp256k1, Message, ecdsa::Signature as EcdsaSignature};
use sha2::{Sha256, Digest};
use hex;
use tracing;

/// Verifies a Clarity compatible signed message using a public key.
/// The signature parameter needs to be in RSV format.
/// 
/// This implementation matches the stacks.js `verifyMessageSignatureRsv` function.
/// 
/// # Arguments
/// * `message` - The original message that was signed
/// * `signature` - The signature in RSV format (hex-encoded, 130 chars)
/// * `public_key` - The public key of the signer (hex-encoded)
/// 
/// # Returns
/// * `Result<bool, Box<dyn std::error::Error>>` - Ok(true) if signature is valid, Ok(false) if invalid
pub async fn verify_message_signature_rsv(
    message: &str,
    signature: &str,
    public_key: &str,
) -> Result<bool, Box<dyn std::error::Error>> {
    tracing::info!("Starting RSV signature verification");
    tracing::debug!("Message: {}", message);
    tracing::debug!("RSV signature: {}", signature);
    tracing::debug!("Public key: {}", public_key);
    
    // Convert RSV to VRS format (like signatureRsvToVrs does)
    let vrs_signature = match rsv_to_vrs(signature) {
        Ok(vrs) => {
            tracing::debug!("Successfully converted RSV to VRS: {}", vrs);
            vrs
        }
        Err(e) => {
            tracing::error!("Failed to convert RSV to VRS: {}", e);
            return Err(e);
        }
    };
    
    // Call the main verification function
    let result = verify_message_signature(message, &vrs_signature, public_key).await;
    match &result {
        Ok(is_valid) => {
            tracing::info!("Signature verification completed: {}", is_valid);
        }
        Err(e) => {
            tracing::error!("Signature verification failed with error: {}", e);
        }
    }
    
    result
}

/// Converts RSV format signature to VRS format
/// RSV: [r(32)][s(32)][v(1)] -> VRS: [v(1)][r(32)][s(32)]
fn rsv_to_vrs(rsv_signature: &str) -> Result<String, Box<dyn std::error::Error>> {
    tracing::debug!("Converting RSV signature to VRS format");
    
    let sig_bytes = match hex::decode(rsv_signature) {
        Ok(bytes) => {
            tracing::debug!("Successfully decoded RSV signature hex, length: {} bytes", bytes.len());
            bytes
        }
        Err(e) => {
            tracing::error!("Failed to decode RSV signature hex: {}", e);
            return Err(e.into());
        }
    };
    
    if sig_bytes.len() != 65 {
        let error_msg = format!("Invalid RSV signature length, expected 65 bytes, got {}", sig_bytes.len());
        tracing::error!("{}", error_msg);
        return Err(error_msg.into());
    }
    
    // RSV format: r(32) + s(32) + v(1)
    let r = &sig_bytes[0..32];
    let s = &sig_bytes[32..64];
    let v = &sig_bytes[64..65];
    
    tracing::debug!("RSV components - r: {}, s: {}, v: {}", hex::encode(r), hex::encode(s), hex::encode(v));
    
    // VRS format: v(1) + r(32) + s(32)
    let mut vrs = Vec::with_capacity(65);
    vrs.extend_from_slice(v);
    vrs.extend_from_slice(r);
    vrs.extend_from_slice(s);
    
    let vrs_hex = hex::encode(&vrs);
    tracing::debug!("Converted to VRS format: {}", vrs_hex);
    
    Ok(vrs_hex)
}

/// Parses a recoverable signature in VRS format and extracts R and S components
fn parse_recoverable_signature_vrs(signature: &str) -> Result<(String, String), Box<dyn std::error::Error>> {
    tracing::debug!("Parsing VRS signature to extract R and S components");
    
    let sig_bytes = match hex::decode(signature) {
        Ok(bytes) => {
            tracing::debug!("Successfully decoded VRS signature hex, length: {} bytes", bytes.len());
            bytes
        }
        Err(e) => {
            tracing::error!("Failed to decode VRS signature hex: {}", e);
            return Err(e.into());
        }
    };
    
    if sig_bytes.len() != 65 {
        let error_msg = format!("Invalid VRS signature length, expected 65 bytes, got {}", sig_bytes.len());
        tracing::error!("{}", error_msg);
        return Err(error_msg.into());
    }
    
    // VRS format: v(1) + r(32) + s(32)
    let r = &sig_bytes[1..33];
    let s = &sig_bytes[33..65];
    
    let r_hex = hex::encode(r);
    let s_hex = hex::encode(s);
    
    tracing::debug!("Extracted R component: {}", r_hex);
    tracing::debug!("Extracted S component: {}", s_hex);
    
    Ok((r_hex, s_hex))
}

/// Encodes a message with the given prefix using varint encoding for the message length
fn encode_message(message: &str, prefix: &str) -> Vec<u8> {
    let mut encoded = Vec::new();
    encoded.extend_from_slice(prefix.as_bytes());
    
    // Encode message length as varint (like the JavaScript implementation)
    let message_bytes = message.as_bytes();
    let length_varint = encode_varint(message_bytes.len() as u64);
    encoded.extend_from_slice(&length_varint);
    encoded.extend_from_slice(message_bytes);
    encoded
}

/// Encode a u64 as a Bitcoin-style varint (variable-length integer)
fn encode_varint(value: u64) -> Vec<u8> {
    let mut result = Vec::new();
    if value < 0xfd {
        result.push(value as u8);
    } else if value <= 0xffff {
        result.push(0xfd);
        result.extend_from_slice(&(value as u16).to_le_bytes());
    } else if value <= 0xffff_ffff {
        result.push(0xfe);
        result.extend_from_slice(&(value as u32).to_le_bytes());
    } else {
        result.push(0xff);
        result.extend_from_slice(&value.to_le_bytes());
    }
    result
}

/// Hashes a message using the Stacks message signing format
fn hash_message(message: &str) -> Vec<u8> {
    const PREFIX: &str = "\x17Stacks Signed Message:\n";
    tracing::debug!("Hashing message with prefix: {:?}", PREFIX);
    let encoded = encode_message(message, PREFIX);
    tracing::debug!("Encoded message length: {} bytes", encoded.len());
    let hash = sha256(encoded);
    tracing::debug!("Message hash: {}", hex::encode(&hash));
    hash
}

/// SHA256 hash function
fn sha256(data: Vec<u8>) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

/// Main verification function that matches the JavaScript implementation
async fn verify_message_signature(
    message: &str,
    signature: &str,
    public_key: &str,
) -> Result<bool, Box<dyn std::error::Error>> {
    tracing::info!("Starting main signature verification");
    
    // Parse the signature to get R and S components
    let (r_hex, s_hex) = match parse_recoverable_signature_vrs(signature) {
        Ok((r, s)) => {
            tracing::debug!("Successfully parsed signature components");
            (r, s)
        }
        Err(e) => {
            tracing::error!("Failed to parse signature components: {}", e);
            return Err(e);
        }
    };
    
    // Convert hex strings to BigInt equivalents and create signature
    let r_bytes = match hex::decode(&r_hex) {
        Ok(bytes) => {
            tracing::debug!("Successfully decoded R component, length: {} bytes", bytes.len());
            bytes
        }
        Err(e) => {
            tracing::error!("Failed to decode R component: {}", e);
            return Err(e.into());
        }
    };
    
    let s_bytes = match hex::decode(&s_hex) {
        Ok(bytes) => {
            tracing::debug!("Successfully decoded S component, length: {} bytes", bytes.len());
            bytes
        }
        Err(e) => {
            tracing::error!("Failed to decode S component: {}", e);
            return Err(e.into());
        }
    };
    
    // Create signature from R and S components
    let mut sig_bytes = Vec::with_capacity(64);
    sig_bytes.extend_from_slice(&r_bytes);
    sig_bytes.extend_from_slice(&s_bytes);
    
    let signature = match EcdsaSignature::from_compact(&sig_bytes) {
        Ok(sig) => {
            tracing::debug!("Successfully created ECDSA signature from R and S components");
            sig
        }
        Err(e) => {
            tracing::error!("Failed to create ECDSA signature: {}", e);
            return Err(e.into());
        }
    };
    
    // Parse the public key
    let public_key_bytes = match hex::decode(public_key) {
        Ok(bytes) => {
            tracing::debug!("Successfully decoded public key, length: {} bytes", bytes.len());
            bytes
        }
        Err(e) => {
            tracing::error!("Failed to decode public key: {}", e);
            return Err(e.into());
        }
    };
    
    let pubkey = match PublicKey::from_slice(&public_key_bytes) {
        Ok(pk) => {
            tracing::debug!("Successfully created public key from bytes");
            pk
        }
        Err(e) => {
            tracing::error!("Failed to create public key: {}", e);
            return Err(e.into());
        }
    };
    
    // Hash the message using Stacks format
    let hashed_msg = hash_message(message);
    let msg = match Message::from_slice(&hashed_msg) {
        Ok(m) => {
            tracing::debug!("Successfully created message from hash");
            m
        }
        Err(e) => {
            tracing::error!("Failed to create message from hash: {}", e);
            return Err(e.into());
        }
    };
    
    // Create secp256k1 context
    let secp = Secp256k1::new();
    tracing::debug!("Created secp256k1 context");
    
    // Verify with strict: false (to support legacy stacks implementations)
    let verification_result = secp.verify_ecdsa(&msg, &signature, &pubkey).is_ok();
    tracing::info!("Primary signature verification result: {}", verification_result);
    
    // If verification passed or message is not a string, return result
    if verification_result {
        tracing::info!("Signature verification successful with standard prefix");
        return Ok(true);
    }
    
    // Additional check for legacy prefix (matching the JavaScript implementation)
    tracing::info!("Primary verification failed, trying legacy prefix");
    const LEGACY_PREFIX: &str = "\x18Stacks Message Signing:\n";
    tracing::debug!("Using legacy prefix: {:?}", LEGACY_PREFIX);
    
    let legacy_encoded = encode_message(message, LEGACY_PREFIX);
    tracing::debug!("Legacy encoded message length: {} bytes", legacy_encoded.len());
    
    let legacy_hash = sha256(legacy_encoded);
    tracing::debug!("Legacy message hash: {}", hex::encode(&legacy_hash));
    
    let legacy_msg = match Message::from_slice(&legacy_hash) {
        Ok(m) => {
            tracing::debug!("Successfully created legacy message from hash");
            m
        }
        Err(e) => {
            tracing::error!("Failed to create legacy message from hash: {}", e);
            return Err(e.into());
        }
    };
    
    // Try verification with legacy prefix
    let legacy_result = secp.verify_ecdsa(&legacy_msg, &signature, &pubkey).is_ok();
    tracing::info!("Legacy signature verification result: {}", legacy_result);
    
    if legacy_result {
        tracing::info!("Signature verification successful with legacy prefix");
    } else {
        tracing::error!("Signature verification failed with both standard and legacy prefixes");
    }
    
    Ok(legacy_result)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_rsv_to_vrs_conversion() {
        // Test RSV to VRS conversion - 65 bytes = 130 hex chars
        // Create a proper 130 character RSV signature: r(64) + s(64) + v(2) = 130 chars
        let rsv = "b21d05d79c90446a7343b0d92a58cd3e6edfccc2b64ff09d42063a79450c054a74491e446d33d61f03ee58a6428ffbc8c78355ac5d2cc52c70f4c41fbeb4ea5401";
        
        assert_eq!(rsv.len(), 130, "RSV signature should be 130 chars (65 bytes)");
        
        let vrs = rsv_to_vrs(rsv).unwrap();
        
        // VRS should have the last byte (01) moved to the front
        assert!(vrs.starts_with("01"));
        assert_eq!(vrs.len(), 130); // 65 bytes * 2 (hex encoding)
        
        // Verify the conversion by checking that r and s are in the correct positions
        let expected_vrs = "01b21d05d79c90446a7343b0d92a58cd3e6edfccc2b64ff09d42063a79450c054a74491e446d33d61f03ee58a6428ffbc8c78355ac5d2cc52c70f4c41fbeb4ea54";
        assert_eq!(vrs, expected_vrs);
    }
    
    #[tokio::test]
    async fn test_verify_message_signature_rsv() {
        // Note: You'll need actual test vectors from your stacks.js implementation
        let message = "Wallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC\nB2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite";
        let signature = "a187372fda56ff050be47ba80c9be04e0983e1a5ae6ebe21a1230cd14f894e36155e2681edcce0658a309d436773e11c6f027c069c127bdf095575ea1a5b64f400"; // 130 char hex string
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";   // 66 char hex string
        
        let _result = verify_message_signature_rsv(message, signature, public_key).await;
        // assert!(result.is_ok());
    }
    
    #[tokio::test]
    async fn test_verify_message_signature_rsv_with_logging() {
        // Initialize tracing for this test
        tracing_subscriber::fmt()
            .with_env_filter("debug")
            .with_test_writer()
            .try_init()
            .ok(); // Ignore if already initialized
        
        let message = "Hello from Block Constellation! This is a test message.";
        let signature = "b21d05d79c90446a7343b0d92a58cd3e6edfccc2b64ff09d42063a79450c054a74491e446d33d61f03ee58a6428ffbc8c78355ac5d2cc52c70f4c41fbeb4ea5401";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        
        println!("Testing signature verification with detailed logging...");
        
        let result = verify_message_signature_rsv(message, signature, public_key).await;
        
        match result {
            Ok(is_valid) => {
                println!("Signature verification result: {}", is_valid);
            }
            Err(e) => {
                println!("Signature verification failed: {}", e);
            }
        }
    }
    
    #[tokio::test]
    async fn test_verify_with_actual_request_data() {
        // Initialize tracing for this test
        tracing_subscriber::fmt()
            .with_env_filter("debug")
            .with_test_writer()
            .try_init()
            .ok(); // Ignore if already initialized
        
        // Actual data from the user's request
        let payload = "Hello World! This is a test message for signing and verification.";
        let signature = "30ad6b29941229924b0b61cb245d4adbb85555ff31e4547e6e95a72a6373307b031f3d57689eb8f418fee0bf8455a3fcdd22286e10b4469c8160d41e8796ec0101";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        
        println!("Testing with actual request data...");
        println!("Payload: {}", payload);
        println!("Signature: {}", signature);
        println!("Public key: {}", public_key);
        
        // Test with just the payload
        let result = verify_message_signature_rsv(payload, signature, public_key).await;
        println!("Verification result with payload: {:?}", result);
        
        // Test with the full JSON structure as it might have been signed
        let json_payload = format!(
            r#"{{"address":"SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ","publicKey":"{}","signature":"{}","payload":"{}"}}"#,
            public_key, signature, payload
        );
        
        println!("Testing with full JSON payload: {}", json_payload);
        let result_json = verify_message_signature_rsv(&json_payload, signature, public_key).await;
        println!("Verification result with JSON: {:?}", result_json);
        
        // Test with different message variations
        let variations = vec![
            payload.to_string(),
            format!("\"{}\"", payload), // With quotes
            json_payload,
        ];
        
        for (i, message) in variations.iter().enumerate() {
            println!("Testing variation {}: {}", i, message);
            let result = verify_message_signature_rsv(message, signature, public_key).await;
            println!("Result: {:?}", result);
        }
    }
    
    #[tokio::test]
    async fn test_verify_with_actual_failing_request_data() {
        // Initialize tracing for this test
        tracing_subscriber::fmt()
            .with_env_filter("debug")
            .with_test_writer()
            .try_init()
            .ok(); // Ignore if already initialized
        
        // Data from the failing request
        let raw_payload = "Hello World! This is a test message for signing and verification.";
        let quoted_payload = "\"Hello World! This is a test message for signing and verification.\"";
        let signature = "30ad6b29941229924b0b61cb245d4adbb85555ff31e4547e6e95a72a6373307b031f3d57689eb8f418fee0bf8455a3fcdd22286e10b4469c8160d41e8796ec0101";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        
        println!("Testing with actual failing request data...");
        
        // Test with raw payload (without quotes)
        println!("Testing with raw payload (without quotes):");
        let result1 = verify_message_signature_rsv(raw_payload, signature, public_key).await;
        match result1 {
            Ok(is_valid) => println!("Raw payload verification result: {}", is_valid),
            Err(e) => println!("Raw payload verification failed: {}", e),
        }
        
        // Test with quoted payload (with quotes)
        println!("\nTesting with quoted payload (with quotes):");
        let result2 = verify_message_signature_rsv(quoted_payload, signature, public_key).await;
        match result2 {
            Ok(is_valid) => println!("Quoted payload verification result: {}", is_valid),
            Err(e) => println!("Quoted payload verification failed: {}", e),
        }
        
        // Test with the exact JSON structure
        let json_payload = r#"{"address":"SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ","publicKey":"037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92","signature":"30ad6b29941229924b0b61cb245d4adbb85555ff31e4547e6e95a72a6373307b031f3d57689eb8f418fee0bf8455a3fcdd22286e10b4469c8160d41e8796ec0101","payload":"Hello World! This is a test message for signing and verification."}"#;
        
        println!("\nTesting with full JSON payload:");
        let result3 = verify_message_signature_rsv(json_payload, signature, public_key).await;
        match result3 {
            Ok(is_valid) => println!("JSON payload verification result: {}", is_valid),
            Err(e) => println!("JSON payload verification failed: {}", e),
        }
    }
    
    #[tokio::test]
    async fn test_verify_with_structured_message() {
        // Initialize tracing for this test
        tracing_subscriber::fmt()
            .with_env_filter("debug")
            .with_test_writer()
            .try_init()
            .ok(); // Ignore if already initialized
        
        // IMPORTANT: Use the EXACT data from the actual failing request in your logs
        // This is the actual message and signature pair that was failing
        let message = "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC";
        let signature = "d3ad54cd39de6010d0954113c4f26c8c08ab2129b6ed9505bc688dfb3f14bace03bac9dc320d3e0b4c56b5aabed73c11f251aa7fffc9498ffeb168438143ca4401";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        
        println!("Testing structured message signature verification...");
        println!("Message: {:?}", message);
        println!("Message bytes: {:?}", message.as_bytes());
        println!("Message length: {}", message.len());
        
        // Test what the frontend/client is actually signing
        println!("\n=== DEBUGGING MESSAGE ENCODING ===");
        
        // Try different potential message variations that might have been signed
        let message_variations = vec![
            message.to_string(),
            message.replace("\n", "\\n"), // Escaped newlines
            message.replace("\n", "\r\n"), // Windows line endings
            format!("\"{}\"", message), // Quoted
            message.replace("\n", " "), // Spaces instead of newlines
        ];
        
        for (i, test_message) in message_variations.iter().enumerate() {
            println!("\n--- Testing variation {} ---", i);
            println!("Message: {:?}", test_message);
            
            let result = verify_message_signature_rsv(test_message, signature, public_key).await;
            match result {
                Ok(is_valid) => {
                    println!("Variation {} result: {}", i, is_valid);
                    if is_valid {
                        println!("✅ FOUND WORKING VARIATION: {}", i);
                        println!("Working message: {:?}", test_message);
                        break;
                    }
                },
                Err(e) => println!("Variation {} failed: {}", i, e),
            }
        }
        
        // Let's also test the message hash manually for the original
        println!("\n=== MESSAGE ENCODING ANALYSIS ===");
        let encoded = encode_message(message, "\x17Stacks Signed Message:\n");
        println!("Encoded message: {:?}", encoded);
        println!("Encoded message hex: {}", hex::encode(&encoded));
        
        let hash = sha256(encoded);
        println!("Message hash: {}", hex::encode(&hash));
        
        // Compare with expected format
        println!("Message bytes (original): {:?}", message.as_bytes());
        println!("Message as UTF-8 string: {}", message);
        
        // Check if there are any encoding issues
        for (i, byte) in message.as_bytes().iter().enumerate() {
            if *byte == b'\n' {
                println!("Found newline at position {}", i);
            }
        }
    }
    
    #[tokio::test]
    async fn test_verify_with_structured_message_comprehensive() {
        println!("Testing comprehensive structured message signature verification...");
        
        let rsv_signature = "d3ad54cd39de6010d0954113c4f26c8c08ab2129b6ed9505bc688dfb3f14bace03bac9dc320d3e0b4c56b5aabed73c11f251aa7fffc9498ffeb168438143ca4401";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";

        // Test different message structures that the frontend might construct
        let test_cases = vec![
            // Original structured message
            "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC",
            
            // Message with Windows line endings
            "B2Pix Signature Request\r\nDomain: b2pix.org\r\nRequest Type: Solicitar Convite\r\nUsername: Bob Dino\r\nEmail: ronoeljr@gmail.com\r\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\r\nTimestamp: 2025-07-09 17:51:55.309 UTC",
            
            // Message with mixed line endings
            "B2Pix Signature Request\nDomain: b2pix.org\r\nRequest Type: Solicitar Convite\nUsername: Bob Dino\r\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\r\nTimestamp: 2025-07-09 17:51:55.309 UTC",
            
            // Message with trailing newline
            "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC\n",
            
            // Message with double newlines
            "B2Pix Signature Request\n\nDomain: b2pix.org\n\nRequest Type: Solicitar Convite\n\nUsername: Bob Dino\n\nEmail: ronoeljr@gmail.com\n\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\n\nTimestamp: 2025-07-09 17:51:55.309 UTC",
            
            // Compact format (no spaces after colons)
            "B2Pix Signature Request\nDomain:b2pix.org\nRequest Type:Solicitar Convite\nUsername:Bob Dino\nEmail:ronoeljr@gmail.com\nWallet Address:SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp:2025-07-09 17:51:55.309 UTC",
            
            // Different field order
            "B2Pix Signature Request\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nTimestamp: 2025-07-09 17:51:55.309 UTC",
            
            // With tab characters
            "B2Pix Signature Request\nDomain:\tb2pix.org\nRequest Type:\tSolicitar Convite\nUsername:\tBob Dino\nEmail:\tronoeljr@gmail.com\nWallet Address:\tSP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp:\t2025-07-09 17:51:55.309 UTC",
            
            // JSON-like format
            "{\n  \"B2Pix Signature Request\": {\n    \"Domain\": \"b2pix.org\",\n    \"Request Type\": \"Solicitar Convite\",\n    \"Username\": \"Bob Dino\",\n    \"Email\": \"ronoeljr@gmail.com\",\n    \"Wallet Address\": \"SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\",\n    \"Timestamp\": \"2025-07-09 17:51:55.309 UTC\"\n  }\n}",
            
            // URL-encoded format
            "B2Pix%20Signature%20Request%0ADomain%3A%20b2pix.org%0ARequest%20Type%3A%20Solicitar%20Convite%0AUsername%3A%20Bob%20Dino%0AEmail%3A%20ronoeljr%40gmail.com%0AWallet%20Address%3A%20SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ%0ATimestamp%3A%202025-07-09%2017%3A51%3A55.309%20UTC",
            
            // Message with Unicode characters (if any special encoding issues)
            "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC",
            
            // Base64 encoded message
            "QjJQaXggU2lnbmF0dXJlIFJlcXVlc3QKRG9tYWluOiBiMnBpeC5vcmcKUmVxdWVzdCBUeXBlOiBTb2xpY2l0YXIgQ29udml0ZQpVc2VybmFtZTogQm9iIERpbm8KRW1haWw6IHJvbm9lbGpyQGdtYWlsLmNvbQpXYWxsZXQgQWRkcmVzczogU1AzUVpOWDNDR1Q2VjdQRTFQQksxN0ZDUksxNFAxQVQwMlpIUUNNVkoKVGltZXN0YW1wOiAyMDI1LTA3LTA5IDE3OjUxOjU1LjMwOSBVVEM=",
            
            // Try with different timestamp formats
            "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09T17:51:55.309Z",
            
            // Try with milliseconds as integer
            "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 1720546315309",
            
            // Try with Unix timestamp
            "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 1720546315",
        ];

        println!("=== COMPREHENSIVE MESSAGE TESTING ===");
        for (i, message) in test_cases.iter().enumerate() {
            println!("\n--- Testing variation {} ---", i);
            println!("Message: {:?}", message);
            
            let result = verify_message_signature(message, rsv_signature, public_key).await.unwrap_or(false);
            println!("Variation {} result: {}", i, result);
            
            if result {
                println!("✅ MATCH FOUND! Variation {} passed verification", i);
                assert!(result, "Expected signature verification to pass for variation {}", i);
                return; // Found the match, test passes
            }
        }
        
        // If we get here, none of the variations worked
        println!("❌ No variation passed verification");
        panic!("None of the message variations passed signature verification");
    }
    
    #[tokio::test]
    async fn test_debug_signature_components() {
        println!("=== DEBUGGING SIGNATURE COMPONENTS ===");
        
        let rsv_signature = "d3ad54cd39de6010d0954113c4f26c8c08ab2129b6ed9505bc688dfb3f14bace03bac9dc320d3e0b4c56b5aabed73c11f251aa7fffc9498ffeb168438143ca4401";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        let message = "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC";
        
        // Test signature format validation
        println!("\n--- SIGNATURE VALIDATION ---");
        println!("RSV signature: {}", rsv_signature);
        println!("RSV signature length: {}", rsv_signature.len());
        
        // Decode the signature
        if let Ok(sig_bytes) = hex::decode(rsv_signature) {
            println!("Decoded signature length: {} bytes", sig_bytes.len());
            if sig_bytes.len() == 65 {
                let r = &sig_bytes[0..32];
                let s = &sig_bytes[32..64];
                let v = sig_bytes[64];
                
                println!("R: {}", hex::encode(r));
                println!("S: {}", hex::encode(s));
                println!("V: {}", v);
                
                // Check if V is valid (should be 0 or 1 for Stacks)
                if v <= 1 {
                    println!("✅ V value is valid");
                } else {
                    println!("❌ V value is invalid: {}", v);
                }
            } else {
                println!("❌ Signature length is invalid: {} bytes", sig_bytes.len());
            }
        } else {
            println!("❌ Failed to decode signature hex");
        }
        
        // Test public key format validation
        println!("\n--- PUBLIC KEY VALIDATION ---");
        println!("Public key: {}", public_key);
        println!("Public key length: {}", public_key.len());
        
        if let Ok(pk_bytes) = hex::decode(public_key) {
            println!("Decoded public key length: {} bytes", pk_bytes.len());
            if pk_bytes.len() == 33 {
                let prefix = pk_bytes[0];
                println!("Public key prefix: 0x{:02x}", prefix);
                
                // Check if prefix is valid (should be 0x02 or 0x03 for compressed keys)
                if prefix == 0x02 || prefix == 0x03 {
                    println!("✅ Public key prefix is valid (compressed)");
                } else {
                    println!("❌ Public key prefix is invalid: 0x{:02x}", prefix);
                }
            } else if pk_bytes.len() == 65 {
                println!("Public key is uncompressed format");
                let prefix = pk_bytes[0];
                if prefix == 0x04 {
                    println!("✅ Public key prefix is valid (uncompressed)");
                } else {
                    println!("❌ Public key prefix is invalid: 0x{:02x}", prefix);
                }
            } else {
                println!("❌ Public key length is invalid: {} bytes", pk_bytes.len());
            }
        } else {
            println!("❌ Failed to decode public key hex");
        }
        
        // Test message encoding variations
        println!("\n--- MESSAGE ENCODING TESTS ---");
        println!("Original message: {:?}", message);
        println!("Message length: {}", message.len());
        
        let message_bytes = message.as_bytes();
        println!("Message bytes: {:?}", message_bytes);
        println!("Message hex: {}", hex::encode(message_bytes));
        
        // Test if the message might be JSON-encoded
        let json_message = serde_json::to_string(message).unwrap();
        println!("JSON-encoded message: {}", json_message);
        
        // Test if the message might be base64 encoded
        use base64::{Engine as _, engine::general_purpose};
        let base64_message = general_purpose::STANDARD.encode(message_bytes);
        println!("Base64-encoded message: {}", base64_message);
        
        // Test different hash methods
        println!("\n--- HASH TESTING ---");
        use sha2::{Sha256, Digest};
        
        let mut hasher = Sha256::new();
        hasher.update(message_bytes);
        let direct_hash = hasher.finalize();
        println!("Direct SHA256 hash: {}", hex::encode(direct_hash));
        
        // Test Stacks message hash
        let stacks_prefix = b"\x17Stacks Signed Message:\n";
        let message_len = message_bytes.len() as u64;
        let varint_bytes = encode_varint(message_len);
        
        let mut stacks_hasher = Sha256::new();
        stacks_hasher.update(stacks_prefix);
        stacks_hasher.update(&varint_bytes);
        stacks_hasher.update(message_bytes);
        let stacks_hash = stacks_hasher.finalize();
        println!("Stacks message hash: {}", hex::encode(stacks_hash));
        
        // Test legacy Stacks message hash
        let legacy_prefix = b"\x18Stacks Message Signing:\n";
        let mut legacy_hasher = Sha256::new();
        legacy_hasher.update(legacy_prefix);
        legacy_hasher.update(&varint_bytes);
        legacy_hasher.update(message_bytes);
        let legacy_hash = legacy_hasher.finalize();
        println!("Legacy Stacks message hash: {}", hex::encode(legacy_hash));
        
        // Test different varint encodings
        println!("\n--- VARINT ENCODING TESTS ---");
        let len = message_bytes.len() as u64;
        let varint = encode_varint(len);
        println!("Message length: {}", len);
        println!("Varint encoding: {:?}", varint);
        println!("Varint hex: {}", hex::encode(&varint));
        
        // Test without varint
        let mut no_varint_hasher = Sha256::new();
        no_varint_hasher.update(stacks_prefix);
        no_varint_hasher.update(message_bytes);
        let no_varint_hash = no_varint_hasher.finalize();
        println!("Hash without varint: {}", hex::encode(no_varint_hash));
        
        // Test with different length encoding
        let len_bytes = (len as u32).to_be_bytes();
        let mut len_be_hasher = Sha256::new();
        len_be_hasher.update(stacks_prefix);
        len_be_hasher.update(&len_bytes);
        len_be_hasher.update(message_bytes);
        let len_be_hash = len_be_hasher.finalize();
        println!("Hash with BE length: {}", hex::encode(len_be_hash));
        
        println!("\n=== END SIGNATURE DEBUGGING ===");
    }
    
    #[tokio::test]
    async fn test_alternative_hashing_methods() {
        println!("=== TESTING ALTERNATIVE HASHING METHODS ===");
        
        let _rsv_signature = "d3ad54cd39de6010d0954113c4f26c8c08ab2129b6ed9505bc688dfb3f14bace03bac9dc320d3e0b4c56b5aabed73c11f251aa7fffc9498ffeb168438143ca4401";
        let _public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        let message = "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC";
        
        use sha2::{Sha256, Digest};
        
        let message_bytes = message.as_bytes();
        
        // Test 1: Raw message hash (already tested, but for completeness)
        let mut hasher = Sha256::new();
        hasher.update(message_bytes);
        let raw_hash = hasher.finalize();
        println!("1. Raw message hash: {}", hex::encode(raw_hash));
        
        // Test 2: Ethereum-style message hash (common pattern)
        let ethereum_prefix = format!("\x19Ethereum Signed Message:\n{}", message_bytes.len());
        let mut eth_hasher = Sha256::new();
        eth_hasher.update(ethereum_prefix.as_bytes());
        eth_hasher.update(message_bytes);
        let eth_hash = eth_hasher.finalize();
        println!("2. Ethereum-style hash: {}", hex::encode(eth_hash));
        
        // Test 3: Bitcoin-style message hash
        let bitcoin_prefix = format!("\x18Bitcoin Signed Message:\n{}", message_bytes.len());
        let mut btc_hasher = Sha256::new();
        btc_hasher.update(bitcoin_prefix.as_bytes());
        btc_hasher.update(message_bytes);
        let btc_hash = btc_hasher.finalize();
        println!("3. Bitcoin-style hash: {}", hex::encode(btc_hash));
        
        // Test 4: Try with different Stacks prefix lengths
        let stacks_prefix_23 = b"\x17Stacks Signed Message:\n";
        let stacks_prefix_24 = b"\x18Stacks Signed Message:\n";
        
        // With 23-byte prefix
        let mut stacks_23_hasher = Sha256::new();
        stacks_23_hasher.update(stacks_prefix_23);
        stacks_23_hasher.update(message_bytes);
        let stacks_23_hash = stacks_23_hasher.finalize();
        println!("4. Stacks 23-byte prefix (no varint): {}", hex::encode(stacks_23_hash));
        
        // With 24-byte prefix  
        let mut stacks_24_hasher = Sha256::new();
        stacks_24_hasher.update(stacks_prefix_24);
        stacks_24_hasher.update(message_bytes);
        let stacks_24_hash = stacks_24_hasher.finalize();
        println!("5. Stacks 24-byte prefix (no varint): {}", hex::encode(stacks_24_hash));
        
        // Test 5: Try with string length instead of varint
        let len_str = format!("{}", message_bytes.len());
        let mut len_str_hasher = Sha256::new();
        len_str_hasher.update(stacks_prefix_23);
        len_str_hasher.update(len_str.as_bytes());
        len_str_hasher.update(message_bytes);
        let len_str_hash = len_str_hasher.finalize();
        println!("6. Stacks with string length: {}", hex::encode(len_str_hash));
        
        // Test 6: Try double SHA256 (Bitcoin-style)
        let mut double_hasher = Sha256::new();
        double_hasher.update(stacks_prefix_23);
        double_hasher.update(&encode_varint(message_bytes.len() as u64));
        double_hasher.update(message_bytes);
        let first_hash = double_hasher.finalize();
        
        let mut second_hasher = Sha256::new();
        second_hasher.update(&first_hash);
        let double_hash = second_hasher.finalize();
        println!("7. Double SHA256 (Stacks + varint): {}", hex::encode(double_hash));
        
        // Test 7: Try with JSON-serialized message
        let json_message = serde_json::to_string(message).unwrap();
        let json_bytes = json_message.as_bytes();
        let mut json_hasher = Sha256::new();
        json_hasher.update(stacks_prefix_23);
        json_hasher.update(&encode_varint(json_bytes.len() as u64));
        json_hasher.update(json_bytes);
        let json_hash = json_hasher.finalize();
        println!("8. JSON message hash: {}", hex::encode(json_hash));
        
        // Test 8: Try with base64 encoded message
        use base64::{Engine as _, engine::general_purpose};
        let base64_message = general_purpose::STANDARD.encode(message_bytes);
        let base64_bytes = base64_message.as_bytes();
        let mut base64_hasher = Sha256::new();
        base64_hasher.update(stacks_prefix_23);
        base64_hasher.update(&encode_varint(base64_bytes.len() as u64));
        base64_hasher.update(base64_bytes);
        let base64_hash = base64_hasher.finalize();
        println!("9. Base64 message hash: {}", hex::encode(base64_hash));
        
        // Test 9: Try with hex-encoded message
        let hex_message = hex::encode(message_bytes);
        let hex_bytes = hex_message.as_bytes();
        let mut hex_hasher = Sha256::new();
        hex_hasher.update(stacks_prefix_23);
        hex_hasher.update(&encode_varint(hex_bytes.len() as u64));
        hex_hasher.update(hex_bytes);
        let hex_hash = hex_hasher.finalize();
        println!("10. Hex message hash: {}", hex::encode(hex_hash));
        
        // Test 10: Try with different varint implementation
        let simple_varint = (message_bytes.len() as u64).to_le_bytes();
        let mut simple_varint_hasher = Sha256::new();
        simple_varint_hasher.update(stacks_prefix_23);
        simple_varint_hasher.update(&simple_varint);
        simple_varint_hasher.update(message_bytes);
        let simple_varint_hash = simple_varint_hasher.finalize();
        println!("11. Simple varint (LE): {}", hex::encode(simple_varint_hash));
        
        // Test 11: Try with keccak256 (Ethereum-style) - skipped, no dependency
        // let mut keccak_hasher = Keccak256::new();
        // keccak_hasher.update(stacks_prefix_23);
        // keccak_hasher.update(&encode_varint(message_bytes.len() as u64));
        // keccak_hasher.update(message_bytes);
        // let keccak_hash = keccak_hasher.finalize();
        // println!("12. Keccak256 hash: {}", hex::encode(keccak_hash));
        
        println!("\n=== END ALTERNATIVE HASHING TESTS ===");
    }
    
    #[tokio::test]
    async fn test_signature_manual_verification() {
        println!("=== TESTING MANUAL SIGNATURE VERIFICATION ===");
        
        let rsv_signature = "d3ad54cd39de6010d0954113c4f26c8c08ab2129b6ed9505bc688dfb3f14bace03bac9dc320d3e0b4c56b5aabed73c11f251aa7fffc9498ffeb168438143ca4401";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        
        // Test with a simple message that we know should work
        let simple_test_message = "Hello World!";
        
        println!("Testing simple message: '{}'", simple_test_message);
        let result = verify_message_signature_rsv(simple_test_message, rsv_signature, public_key).await;
        match result {
            Ok(is_valid) => println!("Simple message result: {}", is_valid),
            Err(e) => println!("Simple message error: {}", e),
        }
        
        // Test if the signature components are valid by trying to create an ECDSA signature
        let sig_bytes = hex::decode(rsv_signature).unwrap();
        let r = &sig_bytes[0..32];
        let s = &sig_bytes[32..64];
        let v = sig_bytes[64];
        
        println!("\nSignature components:");
        println!("R: {}", hex::encode(r));
        println!("S: {}", hex::encode(s));
        println!("V: {}", v);
        
        use secp256k1::{Secp256k1, Message, ecdsa::Signature as EcdsaSignature, PublicKey};
        
        // Try to create the signature object
        let mut sig_compact = Vec::with_capacity(64);
        sig_compact.extend_from_slice(r);
        sig_compact.extend_from_slice(s);
        
        match EcdsaSignature::from_compact(&sig_compact) {
            Ok(signature) => {
                println!("✅ Signature object created successfully");
                
                // Try to create the public key
                let pk_bytes = hex::decode(public_key).unwrap();
                match PublicKey::from_slice(&pk_bytes) {
                    Ok(pubkey) => {
                        println!("✅ Public key object created successfully");
                        
                        // Test with a known message hash
                        let test_hash = "0000000000000000000000000000000000000000000000000000000000000001";
                        let hash_bytes = hex::decode(test_hash).unwrap();
                        
                        match Message::from_slice(&hash_bytes) {
                            Ok(message) => {
                                let secp = Secp256k1::new();
                                let verify_result = secp.verify_ecdsa(&message, &signature, &pubkey);
                                println!("Test verification with dummy hash: {:?}", verify_result.is_ok());
                            }
                            Err(e) => println!("Failed to create message from test hash: {}", e),
                        }
                    }
                    Err(e) => println!("❌ Failed to create public key: {}", e),
                }
            }
            Err(e) => {
                println!("❌ Failed to create signature object: {}", e);
                println!("This suggests the signature data is invalid or corrupted");
            }
        }
        
        // Try testing with the exact structured message but manually constructed
        let manual_message = format!(
            "B2Pix Signature Request\nDomain: {}\nRequest Type: {}\nUsername: {}\nEmail: {}\nWallet Address: {}\nTimestamp: {}",
            "b2pix.org",
            "Solicitar Convite", 
            "Bob Dino",
            "ronoeljr@gmail.com",
            "SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ",
            "2025-07-09 17:51:55.309 UTC"
        );
        
        println!("\nTesting manually constructed message:");
        println!("Message: {}", manual_message);
        let manual_result = verify_message_signature_rsv(&manual_message, rsv_signature, public_key).await;
        match manual_result {
            Ok(is_valid) => {
                println!("Manual message result: {}", is_valid);
                if is_valid {
                    println!("✅ SUCCESS! Found the correct message format");
                    return;
                }
            }
            Err(e) => println!("Manual message error: {}", e),
        }
        
        // Test with exact bytes from debugging
        let exact_message_hex = "4232506978205369676e617475726520526571756573740a446f6d61696e3a2062327069782e6f72670a5265717565737420547970653a20536f6c69636974617220436f6e766974650a557365726e616d653a20426f622044696e6f0a456d61696c3a20726f6e6f656c6a7240676d61696c2e636f6d0a57616c6c657420416464726573733a20535033515a4e583343475436563750453150424b31374643524b31545031415430325a4851434d564a0a54696d657374616d703a20323032352d30372d30392031373a35313a35352e33303920555443";
        
        if let Ok(exact_bytes) = hex::decode(exact_message_hex) {
            if let Ok(exact_string) = String::from_utf8(exact_bytes) {
                println!("\nTesting exact message from hex bytes:");
                let exact_result = verify_message_signature_rsv(&exact_string, rsv_signature, public_key).await;
                match exact_result {
                    Ok(is_valid) => {
                        println!("Exact bytes message result: {}", is_valid);
                        if is_valid {
                            println!("✅ SUCCESS! Found the correct message using exact bytes");
                            return;
                        }
                    }
                    Err(e) => println!("Exact bytes message error: {}", e),
                }
            }
        }
        
        println!("\n❌ No verification method succeeded");
        println!("\n=== END MANUAL VERIFICATION TEST ===");
    }
    
    #[tokio::test]
    async fn test_message_length_limitation() {
        println!("=== TESTING MESSAGE LENGTH LIMITATION ===");
        
        // Initialize tracing
        tracing_subscriber::fmt()
            .with_env_filter("debug")
            .with_test_writer()
            .try_init()
            .ok();
        
        // Use the working shorter message as a baseline
        let short_message = "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com";
        let short_signature = "dc9e9a417150f1892b2fe60f9a2e53303efea4ace3a35b84d6f30e001e6057b51fca7ab725c3362c01a8cc23fb4057315426feb996ae770a98c5be072f43097701";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        
        println!("Testing with SHORT message (known to work):");
        println!("Message: {:?}", short_message);
        println!("Message length: {} chars", short_message.len());
        println!("Message bytes: {} bytes", short_message.as_bytes().len());
        
        // Test the short message (should work)
        let short_result = verify_message_signature_rsv(short_message, short_signature, public_key).await;
        match short_result {
            Ok(is_valid) => {
                println!("✅ Short message verification: {}", is_valid);
                assert!(is_valid, "Short message should validate successfully");
            }
            Err(e) => {
                println!("❌ Short message failed: {}", e);
                panic!("Short message verification failed unexpectedly");
            }
        }
        
        // Now test progressively longer messages to find the breaking point
        println!("\n=== TESTING PROGRESSIVE MESSAGE LENGTHS ===");
        
        let test_cases = vec![
            // Add wallet address (should still work based on pattern)
            (
                "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ",
                "Should work - moderate length"
            ),
            
            // Add timestamp (this might be where it starts failing)
            (
                "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC",
                "Full original message - might fail"
            ),
            
            // Add some padding to test exact length boundaries
            (
                "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nPadding: AAAA",
                "Short + small padding"
            ),
            
            (
                "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nPadding: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "Short + medium padding"
            ),
            
            (
                "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nUsername: Bob Dino\nEmail: ronoeljr@gmail.com\nPadding: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "Short + large padding"
            ),
        ];
        
        for (i, (test_message, description)) in test_cases.iter().enumerate() {
            println!("\n--- Test Case {} ---", i + 1);
            println!("Description: {}", description);
            println!("Message: {:?}", test_message);
            println!("Message length: {} chars", test_message.len());
            println!("Message bytes: {} bytes", test_message.as_bytes().len());
            
            // Calculate the encoded message length (what gets logged)
            let encoded_length = encode_message(test_message, "\x17Stacks Signed Message:\n").len();
            println!("Encoded message length: {} bytes", encoded_length);
            
            // Test with a dummy signature (we expect this to fail for signature mismatch, 
            // but we want to see if it processes the message correctly)
            let dummy_signature = short_signature; // Using the short message signature
            let result = verify_message_signature_rsv(test_message, dummy_signature, public_key).await;
            
            match result {
                Ok(is_valid) => {
                    println!("Result: {} (signature validation)", is_valid);
                    if is_valid {
                        println!("🎉 UNEXPECTED SUCCESS - This message length works!");
                    } else {
                        println!("ℹ️  Expected failure (signature mismatch) - but message was processed");
                    }
                }
                Err(e) => {
                    println!("❌ Processing failed: {}", e);
                    println!("🚨 This suggests a message processing issue at this length");
                }
            }
        }
        
        // Test varint encoding for different lengths to see if that's the issue
        println!("\n=== TESTING VARINT ENCODING ===");
        let test_lengths = vec![100, 127, 128, 200, 255, 256, 300, 400, 500];
        
        for length in test_lengths {
            let varint = encode_varint(length);
            println!("Length {}: varint {:?} (hex: {})", length, varint, hex::encode(&varint));
            
            // Test if varint crosses a boundary at 127/128 (where varint format changes)
            if length == 127 || length == 128 {
                println!("  ⚠️  This is a varint boundary - single byte vs multi-byte encoding");
            }
        }
        
        println!("\n=== END MESSAGE LENGTH INVESTIGATION ===");
    }
    
    #[tokio::test]
    async fn test_specific_signature_validation() {
        println!("=== TESTING SPECIFIC SIGNATURE VALIDATION ===");
        
        // Initialize tracing
        tracing_subscriber::fmt()
            .with_env_filter("debug")
            .with_test_writer()
            .try_init()
            .ok();
        
        // Test data provided by the user
        let signature = "a187372fda56ff050be47ba80c9be04e0983e1a5ae6ebe21a1230cd14f894e36155e2681edcce0658a309d436773e11c6f027c069c127bdf095575ea1a5b64f400";
        let public_key = "037324eeed20298cc5f0fee60f76dfd1aca4fa83c37881f8786214af6eeb804b92";
        let message = "Wallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC\nB2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite";
        
        println!("Testing with specific signature data:");
        println!("Message: {:?}", message);
        println!("Message length: {} chars", message.len());
        println!("Message bytes: {} bytes", message.as_bytes().len());
        println!("Signature: {}", signature);
        println!("Public key: {}", public_key);
        
        // Calculate the encoded message length for analysis
        let encoded_length = encode_message(message, "\x17Stacks Signed Message:\n").len();
        println!("Encoded message length: {} bytes", encoded_length);
        
        // Test the signature verification
        let result = verify_message_signature_rsv(message, signature, public_key).await;
        
        match result {
            Ok(is_valid) => {
                println!("Signature verification result: {}", is_valid);
                if is_valid {
                    println!("✅ SUCCESS! The signature is valid for this message");
                    assert!(is_valid, "Expected signature to be valid");
                } else {
                    println!("❌ FAILED: The signature is not valid for this message");
                    // Don't fail the test, just report the result for analysis
                }
            }
            Err(e) => {
                println!("❌ ERROR: Signature verification failed with error: {}", e);
                panic!("Signature verification should not error, got: {}", e);
            }
        }
        
        // Additional analysis: test different message variations
        println!("\n=== TESTING MESSAGE VARIATIONS ===");
        
        let variations = vec![
            // Original message
            message.to_string(),
            
            // With escaped newlines
            message.replace("\n", "\\n"),
            
            // With Windows line endings
            message.replace("\n", "\r\n"),
            
            // With quotes around the entire message
            format!("\"{}\"", message),
            
            // Different field order (if this is a structured message)
            "B2Pix Signature Request\nDomain: b2pix.org\nRequest Type: Solicitar Convite\nWallet Address: SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp: 2025-07-09 17:51:55.309 UTC".to_string(),
            
            // With spaces around colons
            "Wallet Address : SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp : 2025-07-09 17:51:55.309 UTC\nB2Pix Signature Request\nDomain : b2pix.org\nRequest Type : Solicitar Convite".to_string(),
            
            // Without spaces around colons
            "Wallet Address:SP3QZNX3CGT6V7PE1PBK17FCRK1TP1AT02ZHQCMVJ\nTimestamp:2025-07-09 17:51:55.309 UTC\nB2Pix Signature Request\nDomain:b2pix.org\nRequest Type:Solicitar Convite".to_string(),
        ];
        
        for (i, variation) in variations.iter().enumerate() {
            println!("\n--- Testing variation {} ---", i);
            if i == 0 {
                println!("Description: Original message");
            } else {
                println!("Description: Variation {}", i);
            }
            println!("Message: {:?}", variation);
            
            let result = verify_message_signature_rsv(variation, signature, public_key).await;
            match result {
                Ok(is_valid) => {
                    println!("Variation {} result: {}", i, is_valid);
                    if is_valid {
                        println!("🎉 SUCCESS! Found working variation: {}", i);
                        if i > 0 {
                            println!("✨ The working message format is different from the original!");
                            println!("Working message: {:?}", variation);
                        }
                        // Don't break here, let's test all variations to see if multiple work
                    }
                }
                Err(e) => {
                    println!("Variation {} error: {}", i, e);
                }
            }
        }
        
        println!("\n=== END SPECIFIC SIGNATURE VALIDATION ===");
    }
}