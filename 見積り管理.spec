# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.compat import is_win
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs, collect_submodules

hiddenimports = [
    'webview',
    'webview.platforms.edgechromium',
    'webview.platforms.winforms',
    'clr',
    'pythonnet',
    'win32con',
    'win32gui',
    'win32api',
    'psycopg2',
    'psycopg2._psycopg',
    'openpyxl',
    'app',
    'app.api',
    'app.webview_app',
    'app.display_info',
    'app.database',
    'app.pg_map',
    'app.name_maps',
    'app.cost_quote_service',
    'app.user_config',
    'loadenv',
]
hiddenimports += collect_submodules('webview')
hiddenimports += collect_submodules('openpyxl')

_webview_datas = collect_data_files('webview', subdir='js')
_webview_binaries = []
if is_win:
    _webview_datas += collect_data_files('webview', subdir='lib')
    _webview_binaries = collect_dynamic_libs('webview')

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=_webview_binaries,
    datas=[
        ('config.env', '.'),
        ('app/web', 'app/web'),
        ('app/exceltemplates', 'app/exceltemplates'),
    ] + _webview_datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['flask', 'werkzeug'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='見積り管理',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    icon='app/web/icons/icon.ico',
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
