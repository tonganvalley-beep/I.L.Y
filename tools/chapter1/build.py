"""Compile the reviewed chapter transcript into the existing plain-script node format."""
import json, re
from pathlib import Path
root = Path(__file__).resolve().parents[2]
lines = (Path(__file__).parent / 'source.txt').read_text(encoding='utf-8').splitlines()
nodes = {}; sequence = []; scene = ''; bg = ''; index = 0
backgrounds = {'S01':'bg-coast-night','S02':'bg-apartment-dusk','S03':'bg-apartment-dusk','S04':'ch1-store','S05':'bg-apartment-dusk','S06':'ch1-aquarium-outside'}
def add(node, id=None):
    global index
    index += 1; id = id or f'ch1_{index:03}'
    node.update(chapter='chapter1', chapterTitle='第一章 · 失而复得的日常', scene=scene)
    node.setdefault('background', bg)
    nodes[id] = node; sequence.append(id); return id
started = False
for line in lines:
    line = line.strip()
    if line.startswith('附录 A'): break
    if line.startswith('S01 ｜'): started = True
    if not started or not line: continue
    if re.match(r'S0[1-6] ｜', line):
        scene = line.split(' ｜')[0]; bg = backgrounds[scene] if '（下）' not in line else 'ch1-panorama'
        add(dict(type='dialogue', speaker='第一章', text=line.split(' ｜ ',1)[-1], checkpoint=True), 'ch1_'+scene.lower() if '（下）' not in line else 'ch1_s06b'); continue
    if line.startswith('时间：'):
        add(dict(type='dialogue',speaker='时间与地点',text=' · '.join(line.split('｜')[:2]).replace('时间：','').replace('地点：','').strip())); continue
    if line.startswith(('地点：','选项 ','◆ UI','◆ 策划','◆ 制作')): continue
    if line.startswith('◆ 分歧节点'):
        add(dict(type='choice', speaker='基生（内心）', text='海边那一夜，究竟是梦，还是现实？', choices=[
            dict(text='毫无疑问，是真实的。',flag={'key':'route','value':'A'},next='ch1_reunion'),
            dict(text='是真实的，但……',flag={'key':'route','value':'B'},next='ch1_reunion'),
            dict(text='只是一个噩梦。',flag={'key':'route','value':'C'},next='ch1_c_end')]),'ch1_choice'); continue
    if line.startswith('【C 线'): continue
    if line.startswith('十屋：哇啊啊'): continue # The scream now occurs during the playable search.
    if line.startswith('【Gameplay'):
        g = re.search(r'G[1-5]',line)[0]
        add(dict(type='rpg', map={'G1':'ch1-room','G2':'ch1-room','G3':'ch1-room','G4':'ch1-store','G5':'ch1-entry'}[g], task=g, text={'G1':'整理三处杂物','G2':'赶到浴室门前','G3':'找到两只手柄，在电脑前开局','G4':'挑选食品，到收银台结账','G5':'寻找“爱理”'}[g], checkpoint=True), 'ch1_'+g.lower()); continue
    if line.startswith('◆ Gameplay'):
        add(dict(type='battle', level='ch1-tutorial', text='双人游戏 · 红心弹幕生存练习',checkpoint=True),'ch1_battle'); continue
    if line.startswith('◆'):
        if '房间只留电视' in line: bg='bg-apartment-night'
        if '门口，目送' in line: bg='bg-hallway'
        if '蒙太奇：剃须' in line:
            bg='bg-apartment-dusk'; add(dict(type='dialogue',speaker='旁白',text='剃掉胡须、剪短头发、整理衣着。基生对着镜子，试着重新开始。'))
        if '镜面反射定格' in line: add(dict(type='dialogue',speaker='基生（内心）',text='镜子里，是二十八岁的我，和仍穿着水手服的十八岁少女。',cg='ch1-cg-mirror'))
        if '骤推至' in line: add(dict(type='dialogue',speaker='旁白',text='蓝色吞没了视野。她的眼中，电线般的细丝交错蠕动。',cg='ch1-cg-blue'))
        continue
    if line.startswith('—— 第一章 完'): continue
    route = None
    if line.startswith('【A 线'): route='A'
    if line.startswith('【B 线'): route='B'
    line = re.sub(r'^【[^】]+】','',line)
    clue = re.search(r'〔疑点 (P\d) 记录〕',line)
    line = re.sub(r'〔疑点 P\d 记录〕','',line)
    if '眼前的少女刚把' in line: line='基生推开浴室门，立刻愣住了。门缝后的剪影一晃——他慌忙退出来，关上了门。'
    line=line.replace('浴室里露出的身体依旧是少女的形态','举止也仍是记忆中的模样')
    if line.startswith('水族馆内。'): bg='ch1-aquarium'
    if '两人来到全景水槽前' in line: bg='ch1-panorama'
    if '空水槽前，找到了' in line: bg='ch1-empty-tank'
    if '“咔嗒”——门在两人身后合上' in line: bg='ch1-street'
    if '关了灯一边看电影' in line: bg='bg-apartment-night'
    speaker='旁白'
    if line.startswith('〔内心〕'): speaker='基生（内心）'; line=line[4:]
    elif re.match(r'^(基生|“爱理”|十屋|小泪|男|路人（男）)：',line): speaker,line=line.split('：',1)
    # Expand compressed conversation pairs into individual dialogue nodes.
    parts=line.split('｜') if '｜' in line else [line]
    for n,part in enumerate(parts):
        who = speaker if len(parts)==1 else ('“爱理”' if n%2==0 else '基生')
        if len(parts)>3: who='基生' if n%2==0 else '“爱理”'
        node=dict(type='dialogue',speaker=who,text=part.strip())
        if who=='“爱理”': node['portrait']='ch1-airi-casual' if scene=='S06' else 'portrait-airi'
        if who in ('十屋','小泪'): node['portrait']='ch1-'+('toya' if who=='十屋' else 'rui')
        if route: node['route']=route
        if clue: node['clue']=clue[1]
        if '轻轻抱住' in line or '我一直，都好想见你' in line: node['route']='A'
        if '跌倒在地' in line: node['cg']='ch1-cg-collapse'
        if '玻璃上，倒映出' in line: node['cg']='ch1-cg-reflection'
        if '推开浴室门' in line: node['cg']='ch1-cg-bathroom'
        add(node, 'ch1_reunion' if line.startswith('“咔嗒”——门边') else None)
for a,b in zip(sequence,sequence[1:]):
    if nodes[a]['type']!='choice': nodes[a]['next']=b
nodes[sequence[-1]]['next']='ch1_end'
for id,title,text,target in [('ch1_end','第一章 完','“爱理”倒下了。十屋的惨叫、消失的信号，以及未能说完的心意，留待下一章。','chapter2'),('ch1_c_end','第三章 · 基生视角','基生一遍遍告诉自己，那只是一个噩梦。自那之后，“爱理”再也没有出现在他的世界里。第三章内容待续。','chapter3')]:
    nodes[id]=dict(type='end',chapter='chapter1',chapterTitle='第一章 · 失而复得的日常',title=title,text=text,background='ch1-empty-tank' if target=='chapter2' else 'bg-empty-apartment',continuation=target)
out={'id':'chapter1','title':'第一章 · 失而复得的日常','start':'ch1_s01','nodes':nodes}
(root/'game/data/story/chapter1.js').write_text('// Generated by tools/chapter1/build.py from the reviewed transcript.\nILY.data.stories.chapter1 = '+json.dumps(out,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(f'Built {len(nodes)} chapter-one nodes.')
