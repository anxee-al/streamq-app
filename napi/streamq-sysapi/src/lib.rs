#![deny(clippy::all)]

#[macro_use(lazy_static)] extern crate lazy_static;
#[macro_use] extern crate napi_derive;

pub mod config;
use config::{Config, Keybind};

mod event_emitter;
use event_emitter::EVENT_EMITTER;

mod acrylic_window;
pub use acrylic_window::{apply_acrylic,disable_rounds,sleep};
use napi::{threadsafe_function::{ErrorStrategy, ThreadsafeFunction, ThreadsafeFunctionCallMode}, JsFunction, Result};

use media_session::NowPlaying;

mod keybinds;
mod media_session;

#[napi]
pub fn initialize(config: Config) {
  keybinds::initialize(Config::from(config.clone()));
  media_session::initialize(Config::from(config.clone()));
}

#[napi]
pub fn set_keybinds(keybinds: Vec<Keybind>) {
  keybinds::set_keybinds(keybinds);
}

#[napi]
pub fn pause_all() -> Vec<String> {
  media_session::pause_all()
}

#[napi]
pub fn resume(apps: Vec<String>) {
  media_session::resume(apps);
}

#[napi]
pub fn on(ev: String, callback: JsFunction) -> Result<()> {
  if ev == "keyDown" || ev == "keyUp" || ev == "mouseDown" || ev == "mouseUp" {
    let tsfn: ThreadsafeFunction<u32, ErrorStrategy::CalleeHandled> = callback
      .create_threadsafe_function(0, |ctx| ctx.env.create_uint32(ctx.value).map(|v| vec![v]))?;
    EVENT_EMITTER.lock().unwrap().on(&ev, move |key: u32| { tsfn.call(Ok(key), ThreadsafeFunctionCallMode::Blocking); });
  }
  if ev == "keybindPressed" {
    let tsfn: ThreadsafeFunction<String, ErrorStrategy::CalleeHandled> = callback
      .create_threadsafe_function(0, |ctx: napi::threadsafe_function::ThreadSafeCallContext<String>| ctx.env.create_string(&ctx.value).map(|v| vec![v]))?;
    EVENT_EMITTER.lock().unwrap().on(&ev, move |kb: String| { tsfn.call(Ok(kb), ThreadsafeFunctionCallMode::Blocking); });
  }
  if ev == "nowPlayingChanged" {
    let tsfn: ThreadsafeFunction<Option<NowPlaying>, ErrorStrategy::CalleeHandled> = callback
      .create_threadsafe_function(0, |ctx: napi::threadsafe_function::ThreadSafeCallContext<Option<NowPlaying>>| {
        if ctx.value.is_some() {
          let mut obj = ctx.env.create_object().unwrap();
          obj.set("app", &ctx.value.as_ref().unwrap().app).unwrap();
          obj.set("title", &ctx.value.as_ref().unwrap().title).unwrap();
          Ok(vec![obj])
        } else {
          Ok(vec![])
        }
    })?;
    EVENT_EMITTER.lock().unwrap().on(&ev, move |now_playing: Option<NowPlaying>| { tsfn.call(Ok(now_playing), ThreadsafeFunctionCallMode::Blocking);
    });
  }
  Ok(())
}