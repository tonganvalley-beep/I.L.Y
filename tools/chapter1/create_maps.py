"""Initial authored blockout maps. Edit the resulting JSON for future map changes."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
maps={}
def event(id,x,y,label,**kw): return dict(id=id,x=x,y=y,label=label,**kw)
def make(id,name,events,objects=None):
    rows=['##################']+['#................#']*10+['##################']
    for obj in objects or []:
        for y in range(obj['y'],obj['y']+obj['h']):
            row=list(rows[y]); row[obj['x']:obj['x']+obj['w']]='F'*obj['w']; rows[y]=''.join(row)
    maps[id]=dict(id=id,name=name,width=18,height=12,tileSize=48,spawn={'x':8,'y':9},tiles=rows,hotspots=[],events=events,objects=objects or [],palette={'floor':'#254252' if '水' in name or '展' in name else '#665848','wall':'#192936','furniture':'#998770'},art={'floor':'ch1-tile-floor','wall':'ch1-tile-wall','player':'ch1-sprite-kio','follower':'ch1-sprite-airi'})
make('ch1-room','出租屋 · 8叠1K',[
    event('floor',6,7,'地板',task='G1',kind='collect',text='扫净了地板上的灰尘。'),event('desk',4,3,'桌面',task='G1',kind='collect',text='把桌面收拾干净了。'),event('shelf',13,3,'书架',task='G1',kind='collect',text='漫画一本本回到了书架上。'),
    event('bath',15,2,'浴室门',task='G2',kind='finish',touch=True),event('handle1',3,4,'桌子抽屉',task='G3',kind='collect',text='在抽屉里找到一只手柄。'),event('handle2',12,7,'床底',task='G3',kind='collect',text='另一只手柄在床底。'),event('computer',5,3,'电脑',task='G3',kind='finish')],
    [dict(x=3,y=2,w=3,h=1,label='电脑桌',image='ch1-object-desk'),dict(x=12,y=2,w=3,h=1,label='书架',image='ch1-object-shelf'),dict(x=12,y=5,w=3,h=2,label='床',image='ch1-object-bed')])
make('ch1-store','便利店 · 晚间',[
    event('noodles',3,4,'杯面货架',task='G4',kind='shop',text='海鲜杯面'),event('snack',8,4,'零食货架',task='G4',kind='shop',text='爆米花与可乐'),event('ice',13,4,'冰柜',task='G4',kind='shop',text='冰淇淋'),event('checkout',13,8,'收银台',task='G4',kind='finish')],
    [dict(x=2,y=2,w=3,h=2,label='杯面',image='ch1-object-shelf'),dict(x=7,y=2,w=3,h=2,label='零食',image='ch1-object-shelf'),dict(x=12,y=2,w=3,h=2,label='冰柜',image='ch1-object-tank')])
areas=[('entry','入口与售票处'),('gallery','小展柜回廊'),('isopod','大王具足虫展区'),('empty','空水槽'),('panorama','全景水槽'),('restroom','洗手间通道')]
for i,(slug,name) in enumerate(areas):
    events=[]
    if i>0: events.append(event('west',1,6,'← '+areas[i-1][1],kind='transfer',to='ch1-'+areas[i-1][0],touch=True))
    if i<len(areas)-1: events.append(event('east',16,6,areas[i+1][1]+' →',kind='transfer',to='ch1-'+areas[i+1][0],touch=True))
    if slug=='entry': events.append(event('visitor',5,6,'游客',kind='clue',text='刚才好像看到穿水手服的女孩往展区深处去了。'))
    if slug=='gallery': events.append(event('photo',8,5,'拍照的展柜',kind='clue',text='拍过照的地方，没有她。水声显得格外空。'))
    if slug=='isopod': events.append(event('isopod',8,5,'大王具足虫',kind='clue',text='大王具足虫前也没有她。再去空水槽附近看看。'))
    if slug=='empty': events.append(event('airi',8,5,'空水槽前',kind='reunion',text='那片蓝色里，有一个熟悉的背影。'))
    if slug=='panorama': events.append(event('phone',8,5,'翻盖手机',kind='clue',text='手机突然没有信号了。明明刚才还好好的。'))
    if slug=='restroom': events.append(event('scream',8,6,'走廊深处',kind='scream',touch=True,text='十屋：哇啊啊啊啊——！声音戛然而止。总觉得发生了什么……'))
    make('ch1-'+slug,name,events,[dict(x=5,y=2,w=8,h=2,label=name,image='ch1-object-tank')])
path=root/'game/data/maps/chapter1.json'
path.write_text(json.dumps(maps,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
