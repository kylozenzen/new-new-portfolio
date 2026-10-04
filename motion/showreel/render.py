"""Render showreel.html to MP4: headless Chromium draws each frame, ffmpeg encodes + muxes audio.
usage: python3 render.py 16x9|4x5 out.mp4 [fps]"""
import asyncio, subprocess, sys, pathlib
from playwright.async_api import async_playwright
here = pathlib.Path(__file__).parent
fmt, out = sys.argv[1], sys.argv[2]; fps = int(sys.argv[3]) if len(sys.argv) > 3 else 60
w, h = (1080, 1350) if fmt == '4x5' else (1920, 1080)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': w, 'height': h})
        await pg.goto(f'file://{here.resolve()}/showreel.html?render&format={fmt}')
        await pg.evaluate('window.ready')
        dur = await pg.evaluate('window.DURATION')
        ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'mjpeg', '-i', '-',
                               '-i', str(here / 'audio.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p',
                               '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
        canvas = await pg.query_selector('canvas')
        n = int(round(dur * fps))
        for i in range(n):
            await pg.evaluate(f'renderFrame({i / fps})')
            ff.stdin.write(await canvas.screenshot(type='jpeg', quality=95))
            if i % 300 == 0: print(fmt, i, '/', n, flush=True)
        ff.stdin.close(); ff.wait(); await b.close()
        print('done', out)
asyncio.run(main())
