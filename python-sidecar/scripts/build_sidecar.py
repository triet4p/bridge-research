# python-sidecar/scripts/build_sidecar.py
import os
import subprocess
import platform
import sys

# 1. Xác định đường dẫn tuyệt đối dựa trên vị trí file script này
# Vị trí: python-sidecar/scripts/
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Vị trí: python-sidecar/
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# 2. Cấu hình đường dẫn (Tất cả đều tuyệt đối)
BINARY_NAME = "bridge-ai-backend"
SRC_PATH = os.path.join(PROJECT_ROOT, "src", "main.py")
ENV_PATH = os.path.join(PROJECT_ROOT, ".env")
# Output ra: python-sidecar/../src-tauri/binaries
DIST_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, "..", "src-tauri", "binaries"))
WORK_PATH = os.path.join(PROJECT_ROOT, "build") # Folder tạm để build

def get_target_triple():
    machine = platform.machine().lower()
    system = platform.system().lower()
    
    if system == "windows":
        return "x86_64-pc-windows-msvc"
    elif system == "darwin": 
        return "aarch64-apple-darwin" if machine == "arm64" else "x86_64-apple-darwin"
    elif system == "linux":
        return "x86_64-unknown-linux-gnu"
    else:
        raise Exception(f"Unsupported platform: {system}")

def build():
    print(f"🚀 Starting Build Process...")
    print(f"   Root:   {PROJECT_ROOT}")
    print(f"   Source: {SRC_PATH}")
    print(f"   Env:    {ENV_PATH}")
    print(f"   Output: {DIST_DIR}")

    # Tạo folder output nếu chưa có
    os.makedirs(DIST_DIR, exist_ok=True)

    # Cấu hình --add-data
    # Windows dùng ';', Mac/Linux dùng ':'
    separator = ";" if platform.system() == "Windows" else ":"
    # Cú pháp: "path/to/source.env;." (Dấu chấm nghĩa là đặt vào root của file exe)
    add_data_arg = f"{ENV_PATH}{separator}."

    cmd = [
        "pyinstaller",
        "--clean",
        "--noconfirm",
        "--onefile",
        "--name", BINARY_NAME,
        "--distpath", DIST_DIR,
        "--workpath", WORK_PATH,
        "--specpath", PROJECT_ROOT, # File .spec để ở root python-sidecar
        "--add-data", add_data_arg, 
        SRC_PATH
    ]
    
    try:
        # Chạy lệnh build
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError:
        print("❌ Build Failed.")
        sys.exit(1)
    
    # Đổi tên file theo chuẩn Tauri Sidecar
    target_triple = get_target_triple()
    ext = ".exe" if platform.system() == "Windows" else ""
    
    original_file = os.path.join(DIST_DIR, f"{BINARY_NAME}{ext}")
    target_file = os.path.join(DIST_DIR, f"{BINARY_NAME}-{target_triple}{ext}")
    
    # Xóa file cũ nếu tồn tại
    if os.path.exists(target_file):
        os.remove(target_file)
        
    if os.path.exists(original_file):
        os.rename(original_file, target_file)
        print(f"✅ Build Success! Binary ready at: {target_file}")
    else:
        print(f"❌ Error: Original binary not found at {original_file}")
        sys.exit(1)

if __name__ == "__main__":
    build()