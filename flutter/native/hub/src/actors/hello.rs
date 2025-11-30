use crate::signals::RustHelloRequest;
use crate::signals::RustHelloResponse;
use async_trait::async_trait;
use messages::prelude::{Actor, Address, Context, Notifiable};
use rinf::{DartSignal, RustSignal};
use tokio::spawn;

// Use tokio_with_wasm for web compatibility
use tokio_with_wasm::alias as tokio;

/// The hello actor that responds to hello requests.
pub struct HelloActor;

impl Actor for HelloActor {}

impl HelloActor {
    pub fn new(self_addr: Address<Self>) -> Self {
        tokio::spawn(Self::listen_to_dart(self_addr));
        HelloActor
    }

    async fn listen_to_dart(mut self_addr: Address<Self>) {
        let receiver = RustHelloRequest::get_dart_signal_receiver();
        while let Some(_signal_pack) = receiver.recv().await {
            let _ = self_addr.notify(RustHelloRequest {}).await;
        }
    }
}

#[async_trait]
impl Notifiable<RustHelloRequest> for HelloActor {
    async fn notify(&mut self, _msg: RustHelloRequest, _: &Context<Self>) {
        RustHelloResponse {
            message: "Hello from Rust! 🦀".to_string(),
        }
        .send_signal_to_dart();
    }
}
