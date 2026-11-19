# Builds the client, driver and MB demo files from vezimas-demo.html
src=open('vezimas-demo.html').read().split('\n')
i_note=next(i for i,l in enumerate(src) if l.startswith('<div class="demo-note">'))
i_mode=next(i for i,l in enumerate(src) if l.startswith('const MODE = '))
cfg={'klientams':('<title>Išsiskyrusiems klientams</title>','Klientų versijos demo','client'),
     'admin':('<title>Išsiskyrusiems · vairuotojas</title>','Vairuotojo aplikacijos demo','admin'),
     'mb':('<title>Išsiskyrusiems · MB</title>','MB administravimo demo','mb')}
for f,(t,note,mode) in cfg.items():
    n=list(src); n[0]=t; n[i_note]=n[i_note].replace('Demo versija',note); n[i_mode]=n[i_mode].replace('"owner"',f'"{mode}"')
    assert n!=src
    open(f'vezimas-{f}.html','w').write('\n'.join(n))
print("derived")
