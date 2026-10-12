"""Render de HelpMenu-promotievideo. Vereist Pillow, numpy en imageio-ffmpeg."""
from pathlib import Path
import math, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent
W, H, FPS = 1280, 720, 24
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
scenes = [
 (4, 'vandaag', 'Wat eten we\nvandaag?', 'Meer overzicht.\nMakkelijker kiezen.', 'JOUW KEUKEN, OP ORDE'),
 (5, 'gerechten', 'Al je favoriete\ngerechten.', 'Zoek en filter.\nZie wanneer je iets at.', '01 / GERECHTEN'),
 (5, 'vriezer', 'Weet wat er\nin je vriezer ligt.', 'Porties en personen in beeld.\nZie wat eerst op moet.', '02 / VRIEZER'),
 (4, 'planner', 'Kies alvast\nvoor later.', 'Zet maaltijden klaar\nin je eigen planner.', '03 / PLANNEN'),
 (4, 'restjes', 'Restjes over?\nBewaar ze.', 'Registreer wat je invriest,\nmet porties en datum.', '04 / RESTJES'),
 (4, 'vrienden', 'Samen aan\ntafel.', 'Bewaar etentjes, gerechten\nen voorkeuren van je gezelschap.', '05 / VRIENDEN'),
 (4, 'vandaag', 'Meer overzicht.\nMeer eetplezier.', 'Op telefoon, tablet en computer.\nSamen dezelfde gegevens.', 'ONTDEK HELPMENU'),
]

def font(size, bold=False): return ImageFont.truetype(BOLD if bold else FONT, size)

def make_scene(index):
 duration, name, title, sub, label = scenes[index]
 im = Image.new('RGB', (W,H), '#eef4fc'); d = ImageDraw.Draw(im)
 d.rounded_rectangle((40,36,205,78), radius=14, fill='#175ba7')
 d.text((57,44), 'HelpMenu', font=font(25,True), fill='white')
 d.text((46,151), label, font=font(15,True), fill='#175ba7')
 d.multiline_text((43,197), title, font=font(43,True), fill='#13283e', spacing=9)
 d.multiline_text((46,332), sub, font=font(21), fill='#51657a', spacing=10)
 d.rounded_rectangle((46,464,421,512),radius=16,fill='#dbe9fb')
 d.text((62,479), 'Kiezen  /  Plannen  /  Bewaren',font=font(18,True),fill='#175ba7')
 shot=Image.open(ROOT/'screenshots'/f'{name}.jpg').convert('RGB')
 # Vriendennamen en maaltijdhistorie blijven buiten de publieke video.
 if name == 'vrienden': shot=shot.crop((0,0,shot.width,375))
 else: shot=shot.crop((0,0,shot.width,min(850,shot.height)))
 shot.thumbnail((756,560),Image.Resampling.LANCZOS)
 x,y=478,112
 d.rounded_rectangle((x-9,y-24,x+shot.width+9,y+shot.height+9),radius=16,fill='#cfdded')
 d.rounded_rectangle((x-5,y-20,x+shot.width+5,y+shot.height+5),radius=13,fill='white')
 for n in range(3): d.ellipse((x+10+n*14,y-13,x+16+n*14,y-7),fill='#a8bbd0')
 im.paste(shot,(x,y))
 d.text((46,641),'helpmenu.roriapps.workers.dev',font=font(20,True),fill='#175ba7')
 d.text((1157,651),f'{index+1:02d} / 07',font=font(16),fill='#51657a')
 return im

def music():
 sr=44100; t=np.arange(sr*30)/sr; a=np.zeros_like(t)
 chords=[(48,52,55),(43,47,50),(45,48,52),(41,45,48)]
 def note(start,length,midi,gain):
  lo=int(start*sr); hi=min(len(a),int((start+length)*sr)); z=np.arange(hi-lo)/sr
  f=440*2**((midi-69)/12); env=(1-np.exp(-z*35))*np.exp(-z*2.3)*np.minimum(1,(length-z)*8)
  a[lo:hi]+=gain*env*(np.sin(2*np.pi*f*z)+.22*np.sin(4*np.pi*f*z))
 for beat in range(60):
  chord=chords[(beat//8)%4]
  note(beat*.5,.48,chord[beat%3]+12,.12)
  if beat%2==0: note(beat*.5,.9,chord[0]-.0,.13)
  if beat%8==0:
   for n in chord: note(beat*.5,3.9,n,.045)
 fade=np.minimum(1,t/1.3)*np.minimum(1,(30-t)/2)
 a=np.clip(a*fade*.8,-1,1)
 with wave.open(str(ROOT/'soundtrack.wav'),'wb') as f:
  f.setparams((2,2,sr,0,'NONE','not compressed'))
  stereo=np.column_stack((a,a*.97)); f.writeframes((stereo*32767).astype('<i2').tobytes())

music(); frames=[make_scene(i) for i in range(len(scenes))]
frames[1].save(ROOT/'preview.jpg',quality=92)
ff=imageio_ffmpeg.get_ffmpeg_exe()
p=subprocess.Popen([ff,'-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(ROOT/'soundtrack.wav'),'-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-t','30','-movflags','+faststart',str(ROOT/'helpmenu-promo-30s.mp4')],stdin=subprocess.PIPE,stderr=subprocess.DEVNULL)
for i,(duration,*_) in enumerate(scenes):
 for n in range(duration*FPS):
  frame=frames[i]
  if i and n<10: frame=Image.blend(frames[i-1],frame,(n+1)/10)
  # Een voortgangslijn geeft de rustige montage beweging.
  frame=frame.copy(); draw=ImageDraw.Draw(frame)
  progress=(sum(s[0] for s in scenes[:i])+n/FPS)/30
  draw.rectangle((0,H-5,int(W*progress),H),fill='#2071c9')
  p.stdin.write(frame.tobytes())
p.stdin.close()
if p.wait(): raise RuntimeError('Video render mislukt')
print(ROOT/'helpmenu-promo-30s.mp4')
