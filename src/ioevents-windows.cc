#include <napi.h>
#include <stdio.h>
#include <Windows.h>
#include <iostream>
#include <thread>
#include <future>

Napi::ThreadSafeFunction tsfn;
std::thread nativeThread;
HHOOK _hookKeyboard;
HHOOK _hookMouse;

std::mutex mtx;

struct threadInfo {
  DWORD id;
  std::condition_variable hasId;
} thread_;

struct ioevent {
  std::string *type;
  int *key;
};

auto callback = [](Napi::Env env, Napi::Function jsCallback, ioevent *value) {
  jsCallback.Call({Napi::String::New(env, *value->type), Napi::Number::New(env, *value->key)});
  delete value->type;
  delete value->key;
  delete value;
};

void Stop(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  UnhookWindowsHookEx(_hookKeyboard);
  UnhookWindowsHookEx(_hookMouse);
  std::unique_lock<std::mutex> lck(mtx);
  while (!thread_.id) {
    thread_.hasId.wait(lck);
  }
  PostThreadMessage(thread_.id, WM_QUIT, 0, 0);
}

Napi::Function Start(const Napi::CallbackInfo &info) {
  Napi::Env env = info.Env();

  tsfn = Napi::ThreadSafeFunction::New(env, info[0].As<Napi::Function>(), "IOEvents", 0, 1, [](Napi::Env) { nativeThread.join(); });

  nativeThread = std::thread([] {
    static auto HookEvent = [](std::string *type, int *key) {
      ioevent *value = new ioevent;
      value->type = type;
      value->key = key;
      napi_status status = tsfn.BlockingCall(value, callback);
      if (status != napi_ok) {
        std::cout << "BlockingCall is not ok" << std::endl;
      }
    };
    
    static auto KeyboardHookCallback = [](int nCode, WPARAM wParam, LPARAM lParam) -> LRESULT {
      if (nCode >= 0) {
        KBDLLHOOKSTRUCT *kbdStruct = (KBDLLHOOKSTRUCT*)lParam;
        int code = kbdStruct->vkCode;
        switch (code) {
          case VK_LSHIFT: case VK_RSHIFT:
            code = VK_SHIFT;
            break;
          case VK_LCONTROL: case VK_RCONTROL:
            code = VK_CONTROL;
            break;
          case VK_LMENU: case VK_RMENU:
            code = VK_MENU;
            break;
        }
        if (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN || wParam == WM_KEYUP || wParam == WM_SYSKEYUP) {
          HookEvent(new std::string((wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN) ? "keydown" : "keyup"), new int(code));
        }
      }
      return CallNextHookEx(_hookKeyboard, nCode, wParam, lParam);
    };
    if (!(_hookKeyboard = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardHookCallback, NULL, 0))) {
      MessageBox(NULL, (LPCSTR)"Failed to install hook!", (LPCSTR)"Error", MB_ICONERROR);
    }

    static auto MouseHookCallback = [](int nCode, WPARAM wParam, LPARAM lParam) -> LRESULT {
      if (nCode >= 0) {
        MSLLHOOKSTRUCT *mslStruct = (MSLLHOOKSTRUCT*)lParam;
				if (wParam == WM_LBUTTONDOWN || wParam == WM_LBUTTONUP) {
          HookEvent(new std::string((wParam == WM_LBUTTONDOWN) ? "mousedown" : "mouseup"), new int(0));
				}
				if (wParam == WM_RBUTTONDOWN || wParam == WM_RBUTTONUP) {
          HookEvent(new std::string((wParam == WM_RBUTTONDOWN) ? "mousedown" : "mouseup"), new int(1));
				}
				if (wParam == WM_MBUTTONDOWN || wParam == WM_MBUTTONUP) {
          HookEvent(new std::string((wParam == WM_MBUTTONDOWN) ? "mousedown" : "mouseup"), new int(2));
				}
        if (wParam == WM_XBUTTONDOWN || wParam == WM_XBUTTONUP) {
          HookEvent(new std::string((wParam == WM_XBUTTONDOWN) ? "mousedown" : "mouseup"), new int((int)mslStruct->mouseData / 0x10000 + 2));
        }
      }
      return CallNextHookEx(_hookMouse, nCode, wParam, lParam);
    };
    if (!(_hookMouse = SetWindowsHookEx(WH_MOUSE_LL, MouseHookCallback, NULL, 0))) {
      MessageBox(NULL, (LPCSTR)"Failed to install hook!", (LPCSTR)"Error", MB_ICONERROR);
    }
    
    thread_.id = GetCurrentThreadId();
    thread_.hasId.notify_one();

    MSG msg;
    BOOL bRet;
    while ((bRet = GetMessage(&msg, NULL, 0, 0)) != 0) {
      if (bRet == -1) return;
      TranslateMessage(&msg);
      DispatchMessage(&msg);
    }
  });

  PostThreadMessage(thread_.id, -1, 0, 0);

  return Napi::Function::New(env, Stop, "stop");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "start"), Napi::Function::New(env, Start));
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);