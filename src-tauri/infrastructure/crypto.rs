use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use keyring::Entry;
use rand::rngs::OsRng;
use rand::RngCore;

use crate::errors::app_error::AppError;

/// OS のキーチェーン（macOS Keychain 等）に保存するマスター鍵の識別子。
const KEYRING_SERVICE: &str = "com.robovill.rvmetacode";
const KEYRING_USER: &str = "connection-store-key";
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;

fn to_hex(bytes: &[u8]) -> String {
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

fn from_hex(text: &str) -> Result<Vec<u8>, AppError> {
    if text.len() % 2 != 0 {
        return Err(AppError::crypto("invalid key encoding"));
    }
    (0..text.len())
        .step_by(2)
        .map(|index| {
            u8::from_str_radix(&text[index..index + 2], 16)
                .map_err(|_| AppError::crypto("invalid key encoding"))
        })
        .collect()
}

/// 乱数から 16 バイトの識別子（hex 32 文字）を生成する。
pub fn random_id() -> String {
    let mut bytes = [0u8; 16];
    OsRng.fill_bytes(&mut bytes);
    to_hex(&bytes)
}

/// マスター鍵を OS キーチェーンから取得する。無ければ生成して保存する。
fn load_or_create_key() -> Result<[u8; KEY_LEN], AppError> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER)
        .map_err(|error| AppError::crypto(&format!("keyring unavailable: {error}")))?;
    match entry.get_password() {
        Ok(hex) => {
            let bytes = from_hex(&hex)?;
            bytes
                .try_into()
                .map_err(|_| AppError::crypto("stored key has invalid length"))
        }
        Err(keyring::Error::NoEntry) => {
            let mut key = [0u8; KEY_LEN];
            OsRng.fill_bytes(&mut key);
            entry
                .set_password(&to_hex(&key))
                .map_err(|error| AppError::crypto(&format!("failed to store key: {error}")))?;
            Ok(key)
        }
        Err(error) => Err(AppError::crypto(&format!("keyring error: {error}"))),
    }
}

/// AES-256-GCM で暗号化する。出力は `nonce(12B) || ciphertext`。
pub fn encrypt(plaintext: &[u8]) -> Result<Vec<u8>, AppError> {
    let key_bytes = load_or_create_key()?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key_bytes));

    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| AppError::crypto("encryption failed"))?;

    let mut out = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

/// `encrypt` で作成した blob を復号する。
pub fn decrypt(blob: &[u8]) -> Result<Vec<u8>, AppError> {
    if blob.len() < NONCE_LEN {
        return Err(AppError::crypto("ciphertext too short"));
    }
    let key_bytes = load_or_create_key()?;
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key_bytes));

    let (nonce_bytes, ciphertext) = blob.split_at(NONCE_LEN);
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| AppError::crypto("decryption failed"))
}
