"""Inline fonts + images into showreel.src.html -> showreel.html (one self-contained file)."""
import base64, json, pathlib, sys
here = pathlib.Path(__file__).parent
repo = here.parent.parent
fonts_dir = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/fonts')
b64 = lambda p: base64.b64encode(pathlib.Path(p).read_bytes()).decode()
faces = [("Archivo Black", 400, fonts_dir / 'fontsource-archivo-black-5.3.0/files/archivo-black-latin-400-normal.woff2')]
faces += [("Space Grotesk", w, fonts_dir / f'fontsource-space-grotesk-5.3.0/files/space-grotesk-latin-{w}-normal.woff2') for w in (500, 700)]
css = ''.join(f"@font-face{{font-family:'{n}';font-weight:{w};src:url(data:font/woff2;base64,{b64(p)}) format('woff2')}}" for n, w, p in faces)
images = {
    'headshot': repo / 'assets/images/ben-campbell-headshot.jpg',
    'zoo-giraffe-calf': repo / 'assets/reel/zoo-giraffe-calf.jpg',
    'zoo-lights-entrance': repo / 'assets/reel/zoo-lights-entrance.jpg',
    'zoo-news-crew': repo / 'assets/reel/zoo-news-crew.jpg',
    'codeup-shoot': repo / 'assets/reel/codeup-shoot.jpg',
}
imgs = {k: f'data:image/jpeg;base64,{b64(p)}' for k, p in images.items()}
src = (here / 'showreel.src.html').read_text()
out = src.replace('/*FONTS*/', css).replace('/*IMAGES*/{}', json.dumps(imgs))
(here / 'showreel.html').write_text(out)
print('built', len(out) // 1024, 'KB')
