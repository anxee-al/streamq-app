use std::collections::HashSet;
use std::sync::Mutex;
use std::thread;
use winapi::um::winuser::{
  self, CallNextHookEx, DispatchMessageA, GetMessageA, SetWindowsHookExA, TranslateMessage,
  UnhookWindowsHookEx, KBDLLHOOKSTRUCT, LPMSG, MSLLHOOKSTRUCT, VK_LBUTTON, VK_MBUTTON,
  VK_MEDIA_PLAY_PAUSE, VK_RBUTTON, VK_VOLUME_DOWN, VK_XBUTTON1, VK_XBUTTON2, WH_KEYBOARD_LL,
  WH_MOUSE_LL, WM_KEYDOWN, WM_KEYUP, WM_SYSKEYDOWN, WM_SYSKEYUP,
};
use winapi::shared::windef::HHOOK;

use crate::config::Keybind;
use crate::Config;
use crate::EVENT_EMITTER;

static mut KEYBOARD_HOOK_HANDLE: Option<HHOOK> = None;
static mut MOUSE_HOOK_HANDLE: Option<HHOOK> = None;

lazy_static! {
  pub static ref NOW_PRESSED: Mutex<HashSet<u32>> = Mutex::new(HashSet::new());
  pub static ref KEYBINDS: Mutex<Vec<Keybind>> = Mutex::new(Vec::new());
}

pub fn initialize(config: Config) {
  *KEYBINDS.lock().unwrap() = config.keybinds.clone();
  thread::spawn(move || {
    unsafe {
      let keyboard_hook_id = SetWindowsHookExA(WH_KEYBOARD_LL, Some(keyboard_hook_callback), std::ptr::null_mut(), 0);
      let mouse_hook_id = SetWindowsHookExA(WH_MOUSE_LL, Some(mouse_hook_callback), std::ptr::null_mut(), 0);
      KEYBOARD_HOOK_HANDLE = Some(keyboard_hook_id);
      MOUSE_HOOK_HANDLE = Some(mouse_hook_id);
      let msg: LPMSG = std::ptr::null_mut();
      while GetMessageA(msg, std::ptr::null_mut(), 0, 0) > 0 {
        TranslateMessage(msg);
        DispatchMessageA(msg);
      }
      UnhookWindowsHookEx(keyboard_hook_id);
      UnhookWindowsHookEx(mouse_hook_id);
    }
  });
}

pub fn set_keybinds(keybinds: Vec<Keybind>) {
  *KEYBINDS.lock().unwrap() = keybinds.clone();
}

extern "system" fn keyboard_hook_callback(code: i32, wparam: usize, lparam: isize) -> isize {
  let wparam_int = wparam as u32;
  let keypress: KBDLLHOOKSTRUCT = unsafe { *(lparam as *mut KBDLLHOOKSTRUCT) };
  if wparam_int == WM_KEYDOWN || wparam_int == WM_SYSKEYDOWN {
    NOW_PRESSED.lock().unwrap().insert(keypress.vkCode);
    let keybinds = KEYBINDS.lock().unwrap().clone();
    let keybind = keybinds.iter().find(|&kb| kb.bind.iter().all(|&kb| NOW_PRESSED.lock().unwrap().iter().any(|&k| k == kb)));
    if keybind.is_some() && keybind.unwrap().action.is_some() {
      EVENT_EMITTER.lock().unwrap().emit("keybindPressed", &keybind.unwrap().action.as_ref().unwrap());
      if keypress.vkCode >= VK_VOLUME_DOWN as u32 && keypress.vkCode <= VK_MEDIA_PLAY_PAUSE as u32 {
        return 1;
      }
    }
  } else if wparam_int == WM_KEYUP || wparam_int == WM_SYSKEYUP {
    NOW_PRESSED.lock().unwrap().remove(&keypress.vkCode);
  }
  unsafe {
    if let Some(hook_id) = KEYBOARD_HOOK_HANDLE {
      return CallNextHookEx(hook_id, code, wparam, lparam);
    } else {
      return 0;
    }
  }
}

extern "system" fn mouse_hook_callback(code: i32, wparam: usize, lparam: isize) -> isize {
  let wparam_int = wparam as u32;
  let mousepress: MSLLHOOKSTRUCT = unsafe { *(lparam as *mut MSLLHOOKSTRUCT) };
  let mcode = match wparam_int {
    winuser::WM_LBUTTONDOWN | winuser::WM_LBUTTONUP => VK_LBUTTON as u32,
    winuser::WM_RBUTTONDOWN | winuser::WM_RBUTTONUP => VK_RBUTTON as u32,
    winuser::WM_MBUTTONDOWN | winuser::WM_MBUTTONUP => VK_MBUTTON as u32,
    winuser::WM_XBUTTONDOWN | winuser::WM_XBUTTONUP => match mousepress.mouseData {
      0x10000 => VK_XBUTTON1 as u32,
      0x20000 => VK_XBUTTON2 as u32,
      _ => 0
    }
    _ => 0
  };
  if mcode == 0 {
    return 0;
  }
  if wparam_int == winuser::WM_LBUTTONDOWN || wparam_int == winuser::WM_RBUTTONDOWN || wparam_int == winuser::WM_MBUTTONDOWN || wparam_int == winuser::WM_XBUTTONDOWN {
    NOW_PRESSED.lock().unwrap().insert(mcode);
    let keybinds = KEYBINDS.lock().unwrap().clone();
    let keybind = keybinds.iter().find(|&kb| kb.bind.iter().all(|&kb| NOW_PRESSED.lock().unwrap().iter().any(|&k| k == kb)));
    if keybind.is_some() && keybind.unwrap().action.is_some() {
      EVENT_EMITTER.lock().unwrap().emit("keybindPressed", &keybind.unwrap().action.as_ref().unwrap());
    }
  } else if wparam_int == winuser::WM_LBUTTONUP || wparam_int == winuser::WM_RBUTTONUP || wparam_int == winuser::WM_MBUTTONUP || wparam_int == winuser::WM_XBUTTONUP {
    NOW_PRESSED.lock().unwrap().remove(&mcode);
  }
  unsafe {
    if let Some(hook_id) = MOUSE_HOOK_HANDLE {
      return CallNextHookEx(hook_id, code, wparam, lparam);
    } else {
      return 0;
    }
  }
}