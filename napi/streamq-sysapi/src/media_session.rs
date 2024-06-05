use std::thread;
use crossbeam_channel::unbounded;
use futures::executor::block_on;
use windows::Foundation::{TypedEventHandler, EventRegistrationToken};
use windows::Media::Control::{GlobalSystemMediaTransportControlsSessionManager, GlobalSystemMediaTransportControlsSessionPlaybackStatus};
use std::sync::Mutex;

#[napi(object)]
#[derive(Clone)]
#[derive(PartialEq)]
#[derive(serde::Serialize)]
#[derive(serde::Deserialize)]
pub struct NowPlaying {
  pub app: String,
  pub title: String
}

lazy_static! {
  pub static ref NOW_PLAYING: Mutex<Option<NowPlaying>> = Mutex::new(None);
}

use crate::Config;
use crate::EVENT_EMITTER;

pub fn initialize(config: Config) {
  thread::spawn(move || {
    let manager: GlobalSystemMediaTransportControlsSessionManager = block_on(GlobalSystemMediaTransportControlsSessionManager::RequestAsync().unwrap()).unwrap();
    let (tx, rx) = unbounded();
    let info_changed_chadler = move || {
      let thread_rx = rx.clone();
      thread::spawn(move || {
        println!("Thread spawned");
        let manager: GlobalSystemMediaTransportControlsSessionManager = block_on(GlobalSystemMediaTransportControlsSessionManager::RequestAsync().unwrap()).unwrap();
        let sessions = manager.GetSessions().unwrap();
        struct SessionListeners {
          playback_info_changed: EventRegistrationToken,
          media_properties_changed: EventRegistrationToken
        }
        let mut listeners = vec![];
        for i in 0..sessions.Size().unwrap() {
          println!("streamq-sysapi: Subscribed to \"{:?}\"", sessions.GetAt(i as u32).unwrap().SourceAppUserModelId().unwrap());
          let s = sessions.GetAt(i).unwrap();
          listeners.push(SessionListeners{
            playback_info_changed: s.PlaybackInfoChanged(&TypedEventHandler::new(move |_, _| {
              handle_playback_update();
              Ok(())
            })).unwrap(),
            media_properties_changed: s.MediaPropertiesChanged(&TypedEventHandler::new(move |_, _| {
              handle_playback_update();
              Ok(())
            })).unwrap()
          });
        }
        handle_playback_update();
        thread_rx.recv().unwrap();
        for i in 0..sessions.Size().unwrap() {
          sessions.GetAt(i).unwrap().RemovePlaybackInfoChanged(listeners[i as usize].playback_info_changed).unwrap();
          sessions.GetAt(i).unwrap().RemoveMediaPropertiesChanged(listeners[i as usize].media_properties_changed).unwrap();
          if config.debug { println!("streamq-sysapi: Unsubscribed from \"{:?}\"", sessions.GetAt(i as u32).unwrap()) }
        }
        if config.debug { println!("streamq-sysapi: Sessions changed. Recreating handlers") }
      });
    };
    info_changed_chadler();
    let _ = manager.CurrentSessionChanged(&TypedEventHandler::new(move |_, _| {
      let _ = tx.send(());
      info_changed_chadler();
      Ok(())
    }));
    loop { std::thread::sleep(std::time::Duration::new(1, 0)); }
  });
}

pub fn pause_all() -> Vec<String> {
  let manager: GlobalSystemMediaTransportControlsSessionManager = block_on(GlobalSystemMediaTransportControlsSessionManager::RequestAsync().unwrap()).unwrap();
  let sessions = manager.GetSessions().unwrap();
  let mut paused_apps = vec![];
  for i in 0..sessions.Size().unwrap() {
    let session = sessions.GetAt(i).unwrap();
    let source_app = session.SourceAppUserModelId().unwrap().to_string().to_lowercase();
    if session.GetPlaybackInfo().unwrap().PlaybackStatus().unwrap() == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing && !is_streamq(source_app.clone()) {
      if session.TryPauseAsync().is_ok() {
        paused_apps.push(source_app);
      }
    }
  }
  paused_apps
}

pub fn resume(apps: Vec<String>) {
  let manager: GlobalSystemMediaTransportControlsSessionManager = block_on(GlobalSystemMediaTransportControlsSessionManager::RequestAsync().unwrap()).unwrap();
  let sessions = manager.GetSessions().unwrap();
  for i in 0..sessions.Size().unwrap() {
    let session = sessions.GetAt(i).unwrap();
    let source_app = session.SourceAppUserModelId().unwrap().to_string().to_lowercase();
    if apps.contains(&source_app) {
      let _ = session.TryPlayAsync();
    }
  }
}

fn handle_playback_update() {
  let manager: GlobalSystemMediaTransportControlsSessionManager = block_on(GlobalSystemMediaTransportControlsSessionManager::RequestAsync().unwrap()).unwrap();
  let sessions = manager.GetSessions().unwrap();
  let mut now_playing: Option<NowPlaying> = None;
  for i in 0..sessions.Size().unwrap() {
    let session = sessions.GetAt(i).unwrap();
    let source_app = session.SourceAppUserModelId().unwrap().to_string().to_lowercase();
    println!("streamq-sysapi: Playback changed ({}) {} (isStreamQ: {} {})", session.SourceAppUserModelId().unwrap(), session.GetPlaybackInfo().unwrap().PlaybackStatus().unwrap() == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing, source_app.contains("streamq"), source_app == "electron.exe");
    if session.GetPlaybackInfo().unwrap().PlaybackStatus().unwrap() == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing && !is_streamq(source_app) {
      now_playing = Some(NowPlaying {
          app: session.SourceAppUserModelId().unwrap().to_string(),
          title: match block_on(session.TryGetMediaPropertiesAsync().unwrap()) {
            Ok(media) => media.Title().unwrap().to_string(),
            Err(_) => "<unknown>".to_string()
        }
      });
      break;
    }
  }
  if now_playing != NOW_PLAYING.lock().unwrap().clone() {
    *NOW_PLAYING.lock().unwrap() = now_playing;
    EVENT_EMITTER.lock().unwrap().emit("nowPlayingChanged", NOW_PLAYING.lock().unwrap().clone());
  }
}

fn is_streamq(app: String) -> bool {
  app.contains("streamq") || app == "electron.exe"
}