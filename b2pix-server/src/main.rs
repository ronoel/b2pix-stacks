#[tokio::main]
async fn main() -> anyhow::Result<()> {
    b2pix_rust_server::app::run().await
}
