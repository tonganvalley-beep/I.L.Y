"""Author collision blockouts and render matching pixel scenery from the same JSON."""
import json
from pathlib import Path
from html import escape
ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'game/data/maps'
ART=ROOT/'game/assets/images/maps'
maps={}
def event(id,x,y,label,kind='collect',**kw): return dict(id=id,x=x,y=y,label=label,kind=kind,**kw)
def obj(x,y,w,h,kind,label=''): return dict(x=x,y=y,w=w,h=h,kind=kind,label=label,image='')
def make(id,name,theme,events,objects,spawn=(10,15)):
    w,h=28,18
    rows=[list('#'*w) if y in (0,h-1) else list('#'+'.'*(w-2)+'#') for y in range(h)]
    for o in objects:
        for y in range(o['y'],o['y']+o['h']):
            for x in range(o['x'],o['x']+o['w']):rows[y][x]='F'
    maps[id]=dict(id=id,name=name,width=w,height=h,tileSize=48,spawn=dict(x=spawn[0],y=spawn[1]),tiles=[''.join(r) for r in rows],
        hotspots=[],events=events,objects=objects,theme=theme,palette=dict(floor='#baa277',wall='#28414c',furniture='#728775'),
        art=dict(renderer='pixel-map',nativeTileSize=16,view=dict(columns=17,rows=11),background=id+'-map',player='ch1-sprite-kio'))

make('ch2-island','江之岛 · 上岛小路','coast',[
 event('sea',5,9,'眺望海岸',text='“爱理”：海风好舒服。基生：慢慢走吧。'),
 event('torii',19,8,'鸟居',text='穿过树荫，岛上的声音渐渐远了。'),
 event('exit',24,4,'紫阳花小路',kind='finish',text='前面的小路，好像曾经来过。')],
 [obj(1,1,9,6,'water'),obj(1,11,2,6,'water'),obj(11,2,6,3,'trees'),obj(20,6,5,2,'torii')])
make('ch2-flowers','紫阳花小路 · 八月','garden',[
 event('memory1',8,5,'花丛 · 六月的小路',text='六月的紫阳花，曾经大片大片地开着。',preview='ch2-memory'),
 event('memory2',18,8,'花丛 · 那时的我们',text='照片里的两个人，站在同一条小路上。',preview='ch2-talk'),
 event('memory3',10,13,'花丛 · 她的笑容',text='那时她回过头，笑着等我按下快门。',preview='ch2-blush')],
 [obj(2,2,5,4,'flowers'),obj(12,2,12,3,'trees'),obj(19,7,6,4,'flowers'),obj(3,11,6,4,'flowers'),obj(14,13,10,3,'trees')])
make('ch2-stairs','长楼梯 · 自动售货机','sunset',[
 event('view',7,12,'石阶上的风景',text='十年前，走过这些台阶从没觉得累。'),
 event('water',22,5,'购买冰镇矿泉水 · 160日元',text='投入 160 日元。冰镇矿泉水从取货口滚了出来。')],
 [obj(1,1,4,16,'water'),obj(10,3,7,4,'house'),obj(21,2,3,3,'vending'),obj(18,10,7,6,'house')])
make('ch2-shop','石阶旁 · 冰淇淋店','sunset',[
 event('ice',17,8,'冰淇淋柜台',options=['香草','草莓'],text='店员：请拿好，欢迎下次光临。',flag='CH2_ICE')],
 [obj(1,1,4,16,'water'),obj(11,3,12,5,'ice'),obj(7,12,4,2,'bench'),obj(20,12,4,2,'bench')])
make('ch2-return','夕阳海边 · 归来','sunset',[
 event('figure',23,10,'海风中的身影',text='长发在夕阳下随风飘动。那个人，转过了身。',touch=True)],
 [obj(1,1,26,6,'water'),obj(4,9,5,2,'bench'),obj(15,13,6,2,'trees')])
make('ch3-work','工作地点外 · 夜路','night',[
 event('coworker',9,10,'同事',text='今天也辛苦了。早点休息吧。'),
 event('hibiya',22,10,'日日谷',text='成田先——生！等一下！')],
 [obj(2,2,9,6,'house'),obj(16,2,9,6,'house'),obj(4,12,3,2,'bench'),obj(15,13,6,2,'trees')])
make('ch3-coast','夜海 · 呼唤','nightsea',[
 event('voice',23,10,'浪声的尽头',text='只有海浪。一遍又一遍。',touch=True)],
 [obj(1,1,26,7,'water'),obj(4,12,5,2,'rocks'),obj(17,14,5,2,'rocks')])

def render(m):
    t=16;w=m['width']*t;h=m['height']*t;theme=m.get('theme','aquarium');svg=[]
    def rect(x,y,w,h,c):svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>')
    floor={'store':'#b4c4b9','aquarium':'#395b69','night':'#3f4757','nightsea':'#566270','garden':'#c5bc91','sunset':'#bc9875','coast':'#c7b99c'}.get(theme,'#bba17c')
    rect(0,0,w,h,'#172b3d')
    for y,row in enumerate(m['tiles']):
        for x,tile in enumerate(row):
            if tile=='#':
                rect(x*t,y*t,16,16,'#263d48');rect(x*t,y*t,16,2,'#4f6565')
            else:
                rect(x*t,y*t,16,16,floor);rect(x*t,y*t+15,16,1,'#1b293c28');rect(x*t+(8 if y%2 else 0),y*t,1,15,'#1b293c22')
                if theme=='sunset' and x in range(6,10):rect(x*t,y*t,16,3,'#e0bb8c')
    for o in m['objects']:
        x,y,ow,oh=[o[k]*t for k in ('x','y','w','h')];kind=o.get('kind','tank' if theme=='aquarium' else 'shelf')
        rect(x+2,y+3,ow,oh,'#10213070')
        if kind in ('water','tank'):
            rect(x,y,ow,oh,'#182e42');rect(x+3,y+3,ow-6,oh-6,'#236f86' if theme not in ('sunset','nightsea') else '#826b7b' if theme=='sunset' else '#1e405f')
            for yy in range(6,oh-5,8):
                for xx in range(5,ow-8,24):rect(x+xx+(yy%3)*2,y+yy,10,1,'#89c6c47a')
            if kind=='tank' and m['id']!='ch1-empty':
                for i in range(max(3,ow//25)):
                    fx=x+10+(i*29)%(ow-20);fy=y+8+(i*13)%max(5,oh-18)
                    rect(fx,fy,7,3,'#d6d799');rect(fx-2,fy-1,2,5,'#a9d6ce')
        elif kind in ('trees','flowers'):
            rect(x,y,ow,oh,'#456346')
            for yy in range(3,oh-8,12):
                for xx in range(3,ow-8,12):
                    rect(x+xx,y+yy,10,9,'#708450');rect(x+xx+1,y+yy,6,2,'#91a465')
                    if kind=='flowers' and (xx+yy)%4==2:
                        rect(x+xx+2,y+yy+3,4,4,'#b7a6cc');rect(x+xx+3,y+yy+2,2,6,'#d6cadf')
        elif kind=='house':
            rect(x,y,ow,oh,'#6b6570');rect(x,y,ow,8,'#9a756c');rect(x+5,y+12,ow-10,oh-17,'#a68c79')
            for xx in range(10,ow-16,22):rect(x+xx,y+19,13,18,'#edcc84');rect(x+xx+6,y+19,1,18,'#695f57')
        elif kind=='torii':
            rect(x+4,y,5,oh,'#9f514c');rect(x+ow-9,y,5,oh,'#9f514c');rect(x,y+3,ow,5,'#c4785c');rect(x,y,ow,3,'#393d46')
        elif kind=='vending':
            rect(x,y,ow,oh,'#d6d0b5');rect(x+4,y+4,ow-8,oh-19,'#284753')
            for yy in (8,19):
                for xx in range(8,ow-8,9):rect(x+xx,y+yy,4,7,'#d7b965' if xx%2 else '#97b6c5')
            rect(x+9,y+oh-12,ow-18,7,'#283e4b')
        elif kind in ('shelf','ice'):
            rect(x,y,ow,oh,'#778d8c');rect(x+2,y+2,ow-4,oh-5,'#e4d6b1')
            for yy in range(7,oh-5,13):
                rect(x+3,y+yy+8,ow-6,2,'#8c7667')
                for xx in range(5,ow-5,9):rect(x+xx,y+yy,5,6,['#b57266','#89997b','#bda963'][(xx//9)%3])
        else:
            rect(x,y,ow,oh,'#625854');rect(x+2,y+2,ow-4,oh-5,'#9f8b6b')
            for yy in range(6,oh-3,5):rect(x+2,y+yy,ow-4,1,'#c0a882')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w*3}" height="{h*3}" shape-rendering="crispEdges"><title>{escape(m["name"])}</title>'+''.join(svg)+'</svg>'

old=json.loads((DEST/'chapter1.json').read_text(encoding='utf-8'))
old['ch1-room']['art']['view']=dict(columns=17,rows=11)
for m in old.values():
    if m['id']=='ch1-room':continue
    m['theme']='store' if m['id']=='ch1-store' else 'aquarium'
    m['art'].update(renderer='pixel-map',nativeTileSize=16,view=dict(columns=15,rows=10),background=m['id']+'-map')
    for o in m['objects']:o['kind']='shelf' if m['theme']=='store' else 'tank'
    if m['id']=='ch1-store':
        # A real counter, blocked on the same tiles as its visible footprint.
        if not any(o.get('label')=='收银台' for o in m['objects']):m['objects'].append(obj(11,9,4,1,'shelf','收银台'))
        row=list(m['tiles'][9]);row[11:15]='FFFF';m['tiles'][9]=''.join(row)
    for e in m['events']:
        if e['kind']=='transfer':e['arrival']={'x':2 if e['id']=='east' else 15,'y':6}
(DEST/'chapter1.json').write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(DEST/'chapters.json').write_text(json.dumps(maps,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
paths={}
for m in list(old.values())+list(maps.values()):
    if m['id']=='ch1-room':continue
    filename=m['id']+'.svg';(ART/filename).write_text(render(m),encoding='utf-8');paths[m['id']+'-map']='assets/images/maps/'+filename
# Static Galgame backgrounds for locations with no supplied illustration.
mall=dict(maps['ch3-work'],id='ch3-mall',name='手机店',theme='store',objects=[obj(3,3,7,3,'shelf'),obj(16,3,7,3,'shelf'),obj(6,11,16,2,'ice')])
(ART/'ch3-mall.svg').write_text(render(mall),encoding='utf-8')
(ROOT/'game/data/assets/maps.js').write_text('// Generated by tools/chapters/maps.py. Do not edit directly.\nObject.assign(ILY.data.assets.images, '+json.dumps(paths,ensure_ascii=False,indent=2)+');\n',encoding='utf-8')
