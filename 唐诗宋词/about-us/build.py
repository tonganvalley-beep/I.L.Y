#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""根据 name.txt 生成 about-us 首页与成员子页。"""

import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))

PINYIN = {
    '郭如诚': 'guorucheng',
    '邢嘉轩': 'xingjiaxuan',
    '赵童安': 'zhaotongan',
    '刘旭': 'liuxu',
    '王天浩': 'wangtianhao',
    '李皓辰': 'lihaochen',
}

MOTTOS = {
    'guorucheng': '早日走自己的路吧',
    'xingjiaxuan': 'Life is like a box of chocolate.',
    'zhaotongan': 'Step by Step',
    'liuxu': '灵魂的欲望，是命运的先知',
    'wangtianhao': '想都是问题，做才是答案。',
    'lihaochen': '我是🤖',
}


def parse_name_txt(path):
    team_name = ''
    project_name = ''
    members = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n\r')
            if not line:
                continue
            if line.startswith('队名：'):
                team_name = line.split('：', 1)[1].strip()
            elif line.startswith('项目名：'):
                project_name = line.split('：', 1)[1].strip()
            elif line == '组员：':
                continue
            else:
                parts = line.split('\t')
                if len(parts) >= 2:
                    name = parts[0].strip()
                    role = parts[1].strip()
                    members.append({'name': name, 'role': role, 'pinyin': PINYIN[name]})
    return team_name, project_name, members


def member_list_items(members, current_pinyin=None, from_root=True):
    items = []
    for m in members:
        pinyin = m['pinyin']
        if current_pinyin is not None and pinyin == current_pinyin:
            items.append(f'<li class="current">{m["name"]}</li>')
        else:
            if from_root:
                href = f'./members/{pinyin}/index.html'
            else:
                href = f'../{pinyin}/index.html'
            items.append(f'<li><a href="{href}">{m["name"]}</a></li>')
    return '\n                '.join(items)


def sidebar(is_root, team_name, project_name, members, current_pinyin=None):
    if is_root:
        home_href = 'index.html'
        members_href = '#members'
        logo_href = 'index.html'
    else:
        home_href = '../../index.html'
        members_href = '../../index.html#members'
        logo_href = '../../index.html'

    return f'''<nav class="sidebar">
            <a href="{logo_href}" class="logo" style="text-decoration:none;">{project_name}</a>
            <ul id = "ul1">
                <li><a href="{home_href}">{team_name}首页</a></li>
                <li><a href="{members_href}">{team_name}成员</a></li>
            </ul>
            <ul id = "ul2">
                {member_list_items(members, current_pinyin, from_root=is_root)}
            </ul>
        </nav>'''


def navbar(is_root):
    back_src = 'assets/back.png' if is_root else '../../assets/back.png'
    return f'''<div class="navbar">
                <div class="button">
                    <button onclick="goBack()"><img src = "{back_src}" id = "back" alt="返回"></button>
                </div>
            </div>'''


def generate_index(team_name, project_name, members):
    cards = '\n            '.join(card_html(m, i) for i, m in enumerate(members))
    member_items = '\n                '.join(
        f'<li><a href="./members/{m["pinyin"]}/index.html">{m["name"]}</a></li>' for m in members
    )
    html = f'''<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name} - 关于我们</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        {sidebar(True, team_name, project_name, members)}
        <div class="main-content">
            {navbar(True)}
            <div class="content">
                <h1>欢迎来到 {project_name}</h1>
                <div class="team-intro">
                    <p>我们是 <strong>{team_name}</strong>，负责《{project_name}》项目的开发。</p>
                    <p>团队目前由 {len(members)} 名成员组成，更多信息请悬停卡片或点击查看详情。</p>
                </div>
                <a id="members"></a>
                <div class="cards-grid">
                    {cards}
                </div>
                <div class="footer">
                    <p>&copy; 2026 {team_name} 保留所有权利。</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        function goBack() {{
            window.history.back();
        }}
    </script>
</body>
</html>
'''
    return html


def card_html(m, idx):
    pinyin = m['pinyin']
    return f'''<div class="card">
                        <div class="card-inner">
                            <div class="card-front">
                                <img src="assets/avatars/{pinyin}.png" alt="{m['name']}">
                                <div class="info">
                                    <div class="name">{m['name']}</div>
                                    <div class="role">{m['role']}</div>
                                </div>
                            </div>
                            <div class="card-back">
                                <p class="motto">{MOTTOS[pinyin]}</p>
                                <div class="row">
                                    <button onclick="window.location='members/{pinyin}/index.html'">More About…</button>
                                </div>
                            </div>
                        </div>
                    </div>'''


def generate_member(team_name, project_name, members, current):
    name = current['name']
    pinyin = current['pinyin']
    role = current['role']
    html = f'''<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project_name}：{name}</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <div class="container">
        {sidebar(False, team_name, project_name, members, current_pinyin=pinyin)}
        <div class="main-content">
            {navbar(False)}
            <div class="content">
                <h1>{project_name} 团队成员</h1>
                <h2>{name}</h2>
                <img src="../../assets/avatars/{pinyin}.png" alt="{name}">
                <div class="text-box">
                    <h3>{role}</h3>
                    <blockquote>
                        <p>座右铭待补充</p>
                    </blockquote>
                    <p class="about-heading">关于我</p>
                    <p>个人简介待补充。</p>
                    <p class="about-heading">联系方式</p>
                    <p>联系方式待补充。</p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 {team_name} 保留所有权利。</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        function goBack() {{
            window.history.back();
        }}
    </script>
</body>
</html>
'''
    return html


def main():
    team_name, project_name, members = parse_name_txt(os.path.join(ROOT, 'name.txt'))

    index_html = generate_index(team_name, project_name, members)
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(index_html)

    for m in members:
        member_dir = os.path.join(ROOT, 'members', m['pinyin'])
        os.makedirs(member_dir, exist_ok=True)
        member_html = generate_member(team_name, project_name, members, m)
        with open(os.path.join(member_dir, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(member_html)

    print(f'已生成 {len(members)} 位成员页面：{[m["pinyin"] for m in members]}')
    print(f'首页：{os.path.join(ROOT, "index.html")}')


if __name__ == '__main__':
    main()
