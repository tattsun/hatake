use serde::Serialize;

/// アプリ全体で使うエラー型。Tauri command の戻り値に載せるため Serialize する。
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Docker への接続に失敗しました: {0}")]
    Docker(#[from] bollard::errors::Error),

    #[error("Kubernetes 操作に失敗しました: {0}")]
    Kube(#[from] kube::Error),

    #[error("kubeconfig の読み込みに失敗しました: {0}")]
    KubeConfig(#[from] kube::config::KubeconfigError),

    #[error("rdctl の実行に失敗しました: {0}")]
    Rdctl(String),

    #[error("入出力エラー: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON の解析に失敗しました: {0}")]
    Json(#[from] serde_json::Error),

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = Result<T, AppError>;
