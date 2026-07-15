use crate::application::sdk_generator::SdkGenerator;
use crate::dto::sdk_dto::{GeneratorDescriptor, GeneratorTargetDescriptor};

/// 複数の SDK Generator（Adapter）を束ねる Registry Port。UI は list() を一覧化し、
/// generate は generator(id) で得た Adapter へ委譲する。固定配列を UI/Command に持たせない。
/// 将来 docker / remote 等の Adapter を追加しても本 Port は変更しない。
pub trait GeneratorRegistry {
    /// 登録済み Adapter の記述子（存在・version・対応ターゲット）を返す。
    fn list(&self) -> Vec<GeneratorDescriptor>;

    /// id に対応する Adapter を構築して返す。未登録なら None。
    fn generator(&self, id: &str) -> Option<Box<dyn SdkGenerator>>;
}

/// generator name から package 命名の family と additional-properties キーを決める。
/// 言語別 config 変換（TypeScript=npmName / Python=packageName / Ruby=gemName）の単一の情報源。
/// 戻り値は (family, package_property, version_property)。
pub fn target_properties(generator_name: &str) -> (&'static str, &'static str, &'static str) {
    let name = generator_name.to_ascii_lowercase();
    if name.starts_with("typescript") || name.starts_with("javascript") {
        ("typescript", "npmName", "npmVersion")
    } else if name.starts_with("python") {
        ("python", "packageName", "packageVersion")
    } else if name == "ruby" {
        ("ruby", "gemName", "gemVersion")
    } else {
        // 多くの Generator は packageName/packageVersion を用いる（安全な既定）。
        ("generic", "packageName", "packageVersion")
    }
}

/// openapi-generator-cli で UI に提示する curated なターゲット一覧。
/// （`list -s` の全列挙は膨大なため、当面は代表的な生成器に絞る。）
pub fn openapi_generator_targets() -> Vec<GeneratorTargetDescriptor> {
    [
        ("typescript-fetch", "TypeScript (fetch)"),
        ("typescript-axios", "TypeScript (axios)"),
        ("typescript-node", "TypeScript (node)"),
        ("python", "Python"),
        ("ruby", "Ruby"),
    ]
    .into_iter()
    .map(|(name, display_name)| {
        let (family, package_property, version_property) = target_properties(name);
        GeneratorTargetDescriptor {
            name: name.to_string(),
            display_name: display_name.to_string(),
            family: family.to_string(),
            package_property: package_property.to_string(),
            version_property: version_property.to_string(),
        }
    })
    .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn target_properties_map_by_family() {
        assert_eq!(target_properties("typescript-fetch"), ("typescript", "npmName", "npmVersion"));
        assert_eq!(target_properties("typescript-axios"), ("typescript", "npmName", "npmVersion"));
        assert_eq!(target_properties("python"), ("python", "packageName", "packageVersion"));
        assert_eq!(target_properties("ruby"), ("ruby", "gemName", "gemVersion"));
        assert_eq!(target_properties("go"), ("generic", "packageName", "packageVersion"));
    }

    #[test]
    fn curated_targets_carry_family_specific_keys() {
        let targets = openapi_generator_targets();
        let ts = targets.iter().find(|t| t.name == "typescript-fetch").unwrap();
        assert_eq!(ts.package_property, "npmName");
        let py = targets.iter().find(|t| t.name == "python").unwrap();
        assert_eq!(py.package_property, "packageName");
        let rb = targets.iter().find(|t| t.name == "ruby").unwrap();
        assert_eq!(rb.package_property, "gemName");
    }
}
