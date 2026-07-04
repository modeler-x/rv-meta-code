pub mod application;
pub mod commands;
pub mod domain;
pub mod dto;
pub mod errors;
pub mod infrastructure;
pub mod models;
pub mod repositories;
pub mod services;
pub mod utils;

use crate::commands::schema::compile::compile_schema;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![compile_schema])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
