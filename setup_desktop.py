import os
import subprocess
import tempfile
from pathlib import Path


def main():
    project_dir = Path(__file__).parent.resolve()
    desktop = Path(os.environ['USERPROFILE']) / 'Desktop'
    bat_path = project_dir / 'ФормулаТела.bat'
    icon_path = project_dir / 'icon.ico'

    if not icon_path.exists():
        print('Creating icon...')
        from PIL import Image
        img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        for x in range(64):
            for y in range(64):
                cx, cy = x - 32, y - 28
                dist = (cx * cx + cy * cy) ** 0.5
                if dist < 28:
                    img.putpixel((x, y), (143, 188, 143, 255))
        for x in range(20, 44):
            for y in range(16, 46):
                hx = (x - 32) / 12
                hy = (y - 25) / 12
                val = (hx * hx + hy * hy - 1) ** 3 - hx * hx * hy * hy * hy
                if val < 0 and y < 46:
                    img.putpixel((x, y), (255, 255, 255, 255))
        img.save(str(icon_path), 'ICO')

    # Create VBS script for shortcut (avoids encoding issues)
    vbs_content = f'''
Set WshShell = WScript.CreateObject("WScript.Shell")
Set Shortcut = WshShell.CreateShortcut("{desktop}\\Формула Тела.lnk")
Shortcut.TargetPath = "{bat_path}"
Shortcut.WorkingDirectory = "{project_dir}"
Shortcut.Description = "Formula Tela - Personal digital trainer and nutritionist"
Shortcut.IconLocation = "{icon_path}"
Shortcut.Save()
    '''.strip()

    vbs_path = project_dir / '_create_shortcut.vbs'
    with open(vbs_path, 'w', encoding='cp1251') as f:
        f.write(vbs_content)

    subprocess.run(['cscript', '//nologo', str(vbs_path)],
                   capture_output=True, shell=True)
    vbs_path.unlink()

    shortcut_path = desktop / 'Формула Тела.lnk'
    if shortcut_path.exists():
        print(f'OK: Shortcut created on desktop -> {shortcut_path}')
    else:
        print(f'Warning: Shortcut may not have been created')


if __name__ == '__main__':
    main()
