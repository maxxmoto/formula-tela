import os
import sys
import subprocess
from pathlib import Path


def main():
    desktop = Path(os.environ['USERPROFILE']) / 'Desktop'
    
    # Find the exe on desktop
    exe_path = None
    for f in desktop.iterdir():
        if f.suffix == '.exe' and 'Формула' in f.stem:
            exe_path = f
            break
    
    if not exe_path:
        exe_path = desktop / 'ФормулаТела.exe'
    
    if not exe_path.exists():
        dist_exe = Path(__file__).parent / 'dist'
        exe_from_dist = None
        for f in dist_exe.iterdir():
            if f.suffix == '.exe':
                exe_from_dist = f
                break
        if exe_from_dist and exe_from_dist.exists():
            import shutil
            shutil.copy2(str(exe_from_dist), str(exe_path))
            print(f'Copied: {exe_path}')
        else:
            print('ERROR: exe not found in dist/')
            return
    
    icon_path = Path(__file__).parent / 'icon.ico'
    
    vbs_content = f'''
Set WshShell = WScript.CreateObject("WScript.Shell")
Set Shortcut = WshShell.CreateShortcut("{desktop}\\Формула Тела.lnk")
Shortcut.TargetPath = "{exe_path}"
Shortcut.WorkingDirectory = "{desktop}"
Shortcut.Description = "Формула Тела — персональный цифровой тренер и диетолог"
Shortcut.IconLocation = "{icon_path}, 0"
Shortcut.Save()
    '''.strip()
    
    vbs_path = Path(__file__).parent / '_create_shortcut.vbs'
    with open(vbs_path, 'w', encoding='cp1251') as f:
        f.write(vbs_content)
    
    subprocess.run(['cscript', '//nologo', str(vbs_path)],
                   capture_output=True, shell=True)
    vbs_path.unlink()
    
    shortcut_path = desktop / 'Формула Тела.lnk'
    if shortcut_path.exists():
        print(f'OK: Shortcut updated -> {shortcut_path}')
        print(f'     Target: {exe_path}')
        size_mb = exe_path.stat().st_size / 1024 / 1024
        print(f'     Size: {size_mb:.1f} MB')
    else:
        print('Warning: Shortcut could not be created')


if __name__ == '__main__':
    main()
