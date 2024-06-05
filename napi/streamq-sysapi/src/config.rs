#[napi(object)]
#[derive(Clone)]
#[derive(Debug)]
pub struct Keybind {
  pub action: Option<String>,
  pub bind: Vec<u32>
}

#[napi(object)]
#[derive(Clone)]
pub struct Config {
  pub debug: bool,
  pub keybinds: Vec<Keybind>
}