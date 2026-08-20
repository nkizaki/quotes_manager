"""
PyInstaller / ローカル起動用エントリポイント。
pywebview + 静的 HTML（file://）で起動する。
"""
from app.webview_app import run

if __name__ == "__main__":
    run()
