use std::{thread,time};
use std::ffi::c_void;
use napi::Result;
pub use windows_sys::Win32::{Foundation::*,Graphics::Dwm::*,System::LibraryLoader::*};

type Color = (u8, u8, u8, u8);

#[napi]
pub fn apply_acrylic(hwnd: i64, color: Option<Color>) -> Result<()> {
  unsafe {
    set_window_composition_attribute(hwnd as isize, AccentState::AccentEnableAcrylicblurbehind, color);
  }
  Ok(())
}

#[napi]
pub fn disable_rounds(hwnd: i64) -> Result<()> {
  if is_at_least_build(22523) {
    unsafe {
      DwmSetWindowAttribute(hwnd as isize, DWMWA_WINDOW_CORNER_PREFERENCE as _, &DWMWCP_DONOTROUND as *const _ as _, 4);
    }
  }
  Ok(())
}

#[napi]
pub fn sleep(ms: i64) {
  thread::sleep(time::Duration::from_millis(ms as u64));
}

fn get_function_impl(library: &str, function: &str) -> Option<FARPROC> {
  assert_eq!(library.chars().last(), Some('\0'));
  assert_eq!(function.chars().last(), Some('\0'));

  let module = unsafe { LoadLibraryA(library.as_ptr()) };
  if module == 0 {
    return None;
  }
  Some(unsafe { GetProcAddress(module, function.as_ptr()) })
}

macro_rules! get_function {
  ($lib:expr, $func:ident) => {
    get_function_impl(concat!($lib, '\0'), concat!(stringify!($func), '\0'))
      .map(|f| std::mem::transmute::<::windows_sys::Win32::Foundation::FARPROC, $func>(f))
  };
}

#[allow(unused)]
#[repr(C)]
enum DwmSystembackdropType {
  DwmsbtDisable = 1,         // None
  DwmsbtMainwindow = 2,      // Mica
  DwmsbtTransientwindow = 3, // Acrylic
  DwmsbtTabbedwindow = 4,    // Tabbed
}

#[repr(C)]
struct AccentPolicy {
  accent_state: u32,
  accent_flags: u32,
  gradient_color: u32,
  animation_id: u32,
}

type WINDOWCOMPOSITIONATTRIB = u32;

#[repr(C)]
struct WINDOWCOMPOSITIONATTRIBDATA {
  attrib: WINDOWCOMPOSITIONATTRIB,
  pv_data: *mut c_void,
  cb_data: usize,
}

#[derive(PartialEq)]
#[repr(C)]
enum AccentState {
  AccentEnableAcrylicblurbehind = 4,
}

unsafe fn set_window_composition_attribute(
  hwnd: HWND,
  accent_state: AccentState,
  color: Option<Color>,
) {
  type SetWindowCompositionAttribute = unsafe extern "system" fn(HWND, *mut WINDOWCOMPOSITIONATTRIBDATA) -> BOOL;
  if let Some(set_window_composition_attribute) = get_function!("user32.dll", SetWindowCompositionAttribute) {
    let mut color = color.unwrap_or_default();
    let is_acrylic = accent_state == AccentState::AccentEnableAcrylicblurbehind;
    if is_acrylic && color.3 == 0 {
      color.3 = 1;
    }
    let mut policy = AccentPolicy {
      accent_state: accent_state as _,
      accent_flags: if is_acrylic { 0 } else { 2 },
      gradient_color: (color.0 as u32)
        | (color.1 as u32) << 8
        | (color.2 as u32) << 16
        | (color.3 as u32) << 24,
      animation_id: 0,
    };
    let mut data = WINDOWCOMPOSITIONATTRIBDATA {
      attrib: 0x13,
      pv_data: &mut policy as *mut _ as _,
      cb_data: std::mem::size_of_val(&policy),
    };
    set_window_composition_attribute(hwnd, &mut data as *mut _ as _);
  }
}

fn is_at_least_build(build: u32) -> bool {
  let v = windows_version::OsVersion::current();
  v.build >= build
}