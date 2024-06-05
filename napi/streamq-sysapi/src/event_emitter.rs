use std::sync::Mutex;
use event_emitter_rs::EventEmitter;

lazy_static! {
  pub static ref EVENT_EMITTER: Mutex<EventEmitter> = Mutex::new(EventEmitter::new());
}