use crate::application::facade_generator::FacadeGenerator;
use crate::infrastructure::typescript_facade_generator::TypeScriptFetchFacadeGenerator;

/// generator name に対応する Facade Generator を選ぶ。
/// Facade は生成器の出力構造（import 経路・API クラス形状）に強く依存するため、
/// 検証済みの generator にのみ適用する。未対応の generator には None を返し、誤適用しない。
///
/// 現状は typescript-fetch のみ対応（`../runtime` の Configuration と `../apis` の
/// `new XxxApi(configuration)` を前提とする fetch 固有レイアウト）。typescript-axios /
/// typescript-node は import 経路も API 形状も異なるため対象外。
pub fn facade_for(generator_name: &str) -> Option<Box<dyn FacadeGenerator>> {
    match generator_name {
        "typescript-fetch" => Some(Box::new(TypeScriptFetchFacadeGenerator::new())),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn facade_applies_only_to_typescript_fetch() {
        assert!(facade_for("typescript-fetch").is_some());
        // 誤適用を防ぐ: fetch 以外の typescript / 他言語には Facade を付けない。
        assert!(facade_for("typescript-axios").is_none());
        assert!(facade_for("typescript-node").is_none());
        assert!(facade_for("python").is_none());
        assert!(facade_for("ruby").is_none());
    }
}
