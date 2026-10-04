"""Synthesized score for the showreel. Reads the T timing object straight from
showreel.src.html so sound and picture can't drift apart. Writes audio.wav."""
import json, re, pathlib, wave
import numpy as np

here = pathlib.Path(__file__).parent
src = (here / 'showreel.src.html').read_text()
body = re.search(r'const T = \{(.*?)\};', src, re.S).group(1)
T = json.loads('{' + re.sub(r'(\w+):', r'"\1":', body).replace('\n', ' ').strip().rstrip(',') + '}')
JOBS, TAGS = 4, [2, 3, 3, 3]

SR = 44100
DUR = T['dur']
N = int(SR * DUR)
mix = np.zeros((N, 2))
rng = np.random.default_rng(7)

def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def put(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or i + len(sig) <= 0: return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[i:i + len(sig), 0] += sig * gain * l * 1.41
    mix[i:i + len(sig), 1] += sig * gain * r * 1.41

def lowpass(x, k):
    return np.convolve(x, np.ones(k) / k, mode='same')

def tone(f, dur, d=0.3, harm=(1,), a=0.003):
    n = int(SR * dur); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * h * t) / (k + 1) ** 1.3 for k, h in enumerate(harm))
    return s * env(n, a, d)

# ---- instruments ---------------------------------------------------------------
def kick():
    n = int(SR * .35); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .14)
def clap():
    n = int(SR * .22); s = rng.standard_normal(n); s = s - lowpass(s, 6)
    e = env(n, .001, .06) + .6 * env(n, .001, .012) * (np.arange(n) > SR * .012)
    return s * e * .5
def shaker():
    n = int(SR * .06); s = rng.standard_normal(n); s = s - lowpass(s, 3)
    return s * env(n, .004, .018) * .25
def pluck_bass(f):
    return tone(f, .45, .16, harm=(1, 2, 3)) * .8
def marimba(f):
    n = int(SR * .5); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)) * env(n, .001, .18) * .35
def pop(f=520):
    n = int(SR * .12); t = np.arange(n) / SR
    fr = f * (1 + 1.4 * t / .12)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, .001, .035) * .55
def click():
    n = int(SR * .012); s = rng.standard_normal(n); s = s - lowpass(s, 2)
    return s * env(n, .0005, .003) * .3
def whoosh(dur=.5, up=True):
    n = int(SR * dur); s = rng.standard_normal(n)
    s = lowpass(s, 4) - lowpass(s, 40)
    x = np.linspace(0, 1, n); shape = np.sin(np.pi * (x ** (1.6 if up else .6)))
    return s * shape * .35
def thud():
    n = int(SR * .6); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(38 + 70 * np.exp(-t * 18)) / SR) * env(n, .001, .22)
    s += lowpass(rng.standard_normal(n), 12) * env(n, .001, .05) * .8
    return s
def ding(f=1318.5):
    return tone(f, 1.2, .5, harm=(1, 2.01, 3.98)) * .32
def boing():
    n = int(SR * .45); t = np.arange(n) / SR
    fr = 180 + 220 * np.sin(t * 22) * np.exp(-t * 5) + 120 * t
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, .004, .2) * .45
def scratch():  # record-stop on "SCROLL."
    n = int(SR * .35); t = np.arange(n) / SR
    fr = 900 * np.exp(-t * 9) + 60
    return np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * env(n, .001, .1) * .12

# ---- music: 112 bpm, C – G – Am – F --------------------------------------------
BPM = 112; B = 60 / BPM
ROOTS = [65.41, 98.00, 110.00, 87.31]
CHORDS = [[523.25, 659.25, 783.99], [493.88, 587.33, 783.99], [523.25, 659.25, 880.0], [523.25, 698.46, 880.0]]
def music(a, b, intensity=1.0, start_bar=0):
    t, k = a, 0
    while t < b - 1e-6:
        bar, beat = divmod(k, 4); chord = (bar + start_bar) % 4
        put(kick(), t, .9 * intensity)
        if beat in (1, 3): put(clap(), t, .55 * intensity, .1)
        for h in (0, .5): put(shaker(), t + h * B, .7 * intensity, -.3 + .6 * h)
        put(pluck_bass(ROOTS[chord]), t, .55 * intensity)
        if beat == 2: put(pluck_bass(ROOTS[chord] * 1.5), t + B * .5, .3 * intensity)
        notes = CHORDS[chord]
        for s_ in range(2):
            put(marimba(notes[(beat * 2 + s_) % 3] * (2 if (k + s_) % 5 == 0 else 1)), t + s_ * B * .5, .55 * intensity, (-.4, .4)[s_])
        t += B; k += 1

# Intro: hits only, then the groove starts with the name.
put(pop(440), T['chip'], 1.0); put(thud(), T['chip'] + .28, .35)
put(whoosh(.55), T['flood'], .9)
put(thud(), T['ben'], .5)
put(whoosh(.45, False), T['camp'] - .05, .8, .3); put(thud(), T['camp'] + .3, .6)
music(T['ben'], T['stop'], 1.0)
full = len('Social Media & Content Marketing Manager') + 1
for c in range(full):
    put(click(), T['type'][0] + c * (T['type'][1] - T['type'][0]) / full, .8, rng.uniform(-.3, .3))
put(ding(), T['underline'], .9)
put(whoosh(.55), T['introOut'], .9)
put(pop(660), T['track'] + .35, .8)
# Career stops
for i, a in enumerate(T['stops']):
    put(whoosh(.4), a, .55, -.2); put(click(), a + .4, 1.0)
    put(pop(700), a + .3, .45)
    for k in range(TAGS[i]): put(pop(620 + 90 * k), a + .95 + k * .16, .7, -.3 + .3 * k)
put(whoosh(.45), T['next'], .55); put(boing(), T['next'] + .55, .9)
# Numbers
put(whoosh(.6), T['numbers'], 1.0)
for i in range(4): put(pop(500 + 70 * i), T['numbers'] + .12 + i * .08, .5)
for i in range(4):
    for k in range(9): put(click(), T['count'] + i * .22 + (k / 9) ** 2 * 1.1, .7, -.3 + .2 * i)
    put(ding(1046.5 * (1 + .12 * i)), T['count'] + i * .22 + 1.1, .35)
put(thud(), T['stamp'] + .18, .9)
put(whoosh(.6, False), T['numbersOut'], .9)
# Stop the scroll: a rising zip, then everything halts on "SCROLL."
zip_n = int(SR * (T['stop'] - T['scroll'] + .2)); x = np.linspace(0, 1, zip_n)
zz = np.sin(2 * np.pi * np.cumsum(300 + 1600 * x ** 2) / SR) * .06 + (lowpass(rng.standard_normal(zip_n), 3) - lowpass(rng.standard_normal(zip_n), 30)) * x * .3
put(zz * x, T['scroll'] - .2, .8)
put(thud(), T['stop'], 1.3); put(scratch(), T['stop'] + .02, 1.0)
# Now pursuing: groove comes back
put(whoosh(.5), T['pursue'], 1.0)
music(T['pursue'] + .12, T['end'] + .15, .9, start_bar=0)
put(pop(780), T['pursue'] + 1.0, .6)
put(ding(1567.98), T['slotFill'], .9); put(ding(1975.5), T['slotFill'] + .1, .5)
# End card: a held major chord, light pulse underneath, then out.
a = T['end'] + .15
for f in (261.63, 329.63, 392.0, 523.25, 659.25):
    put(tone(f, DUR - a, 2.2, harm=(1, 2, 3)) * .22, a, 1.0, rng.uniform(-.4, .4))
put(kick(), a, .9); put(thud(), a, .4)
music(a + 2 * B, DUR - .3, .45, start_bar=0)
put(pop(560), a + .1 + .9, .7)
for n_ in (a + 2.0, a + 2.9): put(pop(820), n_ + .1, .4)

# ---- master ---------------------------------------------------------------------
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= .89
fade = int(SR * .35); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open(str(here / 'audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('audio.wav', round(DUR, 2), 's')
