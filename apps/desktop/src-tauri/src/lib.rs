use serde::Serialize;
use tauri::Manager;

const SERVICE: &str = "aagc-saas";

#[derive(Serialize)]
struct Tokens {
    accessToken: Option<String>,
    refreshToken: Option<String>,
}

fn entry(key: &str) -> keyring::Entry {
    // No Windows: Credential Manager; no macOS: Keychain; no Linux: Secret Service (quando disponível).
    keyring::Entry::new(SERVICE, key).expect("keyring entry")
}

#[tauri::command]
fn set_tokens(accessToken: String, refreshToken: String) -> Result<(), String> {
    entry("accessToken")
        .set_password(&accessToken)
        .map_err(|e| e.to_string())?;
    entry("refreshToken")
        .set_password(&refreshToken)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_tokens() -> Result<Tokens, String> {
    let access = entry("accessToken").get_password().ok();
    let refresh = entry("refreshToken").get_password().ok();
    Ok(Tokens {
        accessToken: access,
        refreshToken: refresh,
    })
}

#[tauri::command]
fn clear_tokens() -> Result<(), String> {
    let _ = entry("accessToken").delete_password();
    let _ = entry("refreshToken").delete_password();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Thin client: por padrão carrega o Web SaaS.
            // Em DEV: http://localhost:3000 (Next)
            // Em PROD: defina AAGC_START_URL (ex.: https://sua-plataforma.com)
            let start_url = std::env::var("AAGC_START_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());

            if let Some(window) = app.get_webview_window("main") {
                // Redireciona o webview para o SaaS.
                // Usamos eval para evitar diferenças de API entre versões.
                let js = format!("window.location.replace({});", serde_json::to_string(&start_url).unwrap());
                let _ = window.eval(&js);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![set_tokens, get_tokens, clear_tokens])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
