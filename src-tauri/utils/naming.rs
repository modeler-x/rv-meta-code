/// snake_case / 空白区切り / ハイフン区切り等を単語へ分割する（英数字以外を区切りに）。
fn words(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|w| !w.is_empty())
        .map(|w| w.to_string())
        .collect()
}

fn capitalize(word: &str) -> String {
    let mut chars = word.chars();
    match chars.next() {
        Some(first) => first.to_ascii_uppercase().to_string() + &chars.as_str().to_ascii_lowercase(),
        None => String::new(),
    }
}

/// lowerCamelCase（先頭語は小文字、以降は各語頭大文字）。例: order_management -> orderManagement。
pub fn lower_camel(text: &str) -> String {
    let parts = words(text);
    let mut out = String::new();
    for (index, word) in parts.iter().enumerate() {
        if index == 0 {
            out.push_str(&word.to_ascii_lowercase());
        } else {
            out.push_str(&capitalize(word));
        }
    }
    out
}

/// PascalCase（各語頭大文字）。例: "Auth Admin" -> AuthAdmin。
pub fn pascal_case(text: &str) -> String {
    words(text).iter().map(|w| capitalize(w)).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lower_camel_cases() {
        assert_eq!(lower_camel("auth"), "auth");
        assert_eq!(lower_camel("order_management"), "orderManagement");
        assert_eq!(lower_camel("Auth Admin"), "authAdmin");
    }

    #[test]
    fn pascal_cases() {
        assert_eq!(pascal_case("auth"), "Auth");
        assert_eq!(pascal_case("Auth Admin"), "AuthAdmin");
        assert_eq!(pascal_case("order_management"), "OrderManagement");
    }
}
