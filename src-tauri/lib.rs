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

use crate::commands::connection::delete::delete_connection;
use crate::commands::connection::list::list_connections;
use crate::commands::connection::save::save_connection;
use crate::commands::connection::set_active::set_active_connection;
use crate::commands::connection::test::test_connection;
use crate::commands::metadata::current_connection::get_current_connection;
use crate::commands::metadata::documents::list_documents;
use crate::commands::metadata::entities::list_entities;
use crate::commands::metadata::entity_detail::get_entity_detail;
use crate::commands::metadata::openapi_specs::get_openapi_specs;
use crate::commands::metadata::operation::get_operation;
use crate::commands::metadata::operation_groups::detail::get_operation_group_detail;
use crate::commands::metadata::operation_groups::list::list_operation_groups;
use crate::commands::metadata::schemas::list_schemas;
use crate::commands::metadata::set_read_only::set_read_only;
use crate::commands::metadata::validate_openapi::validate_openapi;
use crate::commands::schema::compile::compile_schema;
use crate::commands::server::delete::delete_server;
use crate::commands::server::list::list_servers;
use crate::commands::server::save::save_server;
use crate::commands::server::test::test_server;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                // 配布後にユーザー端末でログが肥大化しないよう、
                // 1ファイル最大 5MB・世代は 1 つだけ保持する。
                .max_file_size(5_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                ])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            compile_schema,
            list_connections,
            save_connection,
            delete_connection,
            set_active_connection,
            test_connection,
            get_current_connection,
            list_schemas,
            list_documents,
            list_entities,
            get_entity_detail,
            get_operation,
            list_operation_groups,
            get_operation_group_detail,
            validate_openapi,
            set_read_only,
            get_openapi_specs,
            list_servers,
            save_server,
            delete_server,
            test_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
