# 新东方前途出国 - 快速数据提取工具
import requests
import json
import time
from pathlib import Path

print("=" * 60)
print("新东方前途出国 - 快速数据提取工具")
print("=" * 60)

# 创建输出目录
output_dir = Path("output/data")
output_dir.mkdir(parents=True, exist_ok=True)

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
})

data = {
    'cases': [],
    'articles': [],
    'universities': [],
    'countries': []
}

def get_page(url, max_retries=3):
    """获取页面内容"""
    for attempt in range(max_retries):
        try:
            response = session.get(url, timeout=30)
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"  请求失败 ({attempt+1}/{max_retries})")
            time.sleep(2)
    return None

# 1. 抓取案例库
print("\n[1/4] 正在抓取案例库...")
base_url = 'https://liuxue.xdf.cn/case/'
all_cases = []

for page in range(1, 21):  # 先抓取前20页
    url = base_url if page == 1 else f'{base_url}?page={page}'
    html = get_page(url)
    
    if not html:
        print(f"  第{page}页抓取失败")
        break
    
    # 简单的案例提取
    import re
    case_links = re.findall(r'href="(/case/\d+\.html)"', html)
    
    if case_links:
        for link in case_links:
            all_cases.append({
                'url': f'https://liuxue.xdf.cn{link}',
                'page': page
            })
        print(f"  ✓ 第{page}页: {len(case_links)}条 (累计{len(all_cases)}条)")
    else:
        print(f"  第{page}页: 无数据")
        break
    
    time.sleep(0.5)

data['cases'] = all_cases
print(f"\n  案例总计: {len(all_cases)}条")

# 2. 抓取各国院校
print("\n[2/4] 正在抓取各国院校...")
countries = [
    ('美国', '/USA/', 1),
    ('英国', '/UK/', 2),
    ('加拿大', '/Canada/', 3),
    ('澳大利亚', '/Australia/', 4),
    ('日本', '/Japan/', 6),
    ('中国香港', '/HK/', 7),
    ('新加坡', '/Singapore/', 8),
    ('德国', '/Germany/', 10),
    ('法国', '/France/', 11),
]

all_universities = []

for country_name, path, country_id in countries:
    url = f'https://liuxue.xdf.cn{path}'
    print(f"  正在抓取: {country_name}...")
    
    html = get_page(url)
    if html:
        uni_links = re.findall(r'href="(/school/\d+\.html)"', html)
        if uni_links:
            for link in uni_links[:30]:
                all_universities.append({
                    'url': f'https://liuxue.xdf.cn{link}',
                    'country': country_name,
                    'country_id': country_id
                })
            print(f"    ✓ {len(uni_links[:30])}所院校")
        else:
            print(f"    - 页面存在")
    else:
        print(f"    ✗ 无法访问")
    
    time.sleep(1)

data['universities'] = all_universities
print(f"\n  院校总计: {len(all_universities)}所")

# 3. 抓取文章
print("\n[3/4] 正在抓取文章资讯...")
all_articles = []

for page in range(1, 11):
    url = 'https://liuxue.xdf.cn/news/' if page == 1 else f'https://liuxue.xdf.cn/news/list/{page}/'
    html = get_page(url)
    
    if not html:
        break
    
    article_links = re.findall(r'href="(/news/\d+\.html)"', html)
    if article_links:
        for link in article_links:
            all_articles.append({
                'url': f'https://liuxue.xdf.cn{link}',
                'page': page
            })
        print(f"  ✓ 第{page}页: {len(article_links)}篇 (累计{len(all_articles)}篇)")
    else:
        break
    
    time.sleep(0.5)

data['articles'] = all_articles
print(f"\n  文章总计: {len(all_articles)}篇")

# 4. 保存数据
print("\n[4/4] 正在保存数据...")

# 保存JSON
for key, value in data.items():
    filename = f'{key}.json'
    filepath = output_dir / filename
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump({
            'total': len(value),
            'data': value,
            'scrape_time': time.strftime('%Y-%m-%d %H:%M:%S')
        }, f, ensure_ascii=False, indent=2)
    
    print(f"  ✓ {filename}: {len(value)}条")

total = sum(len(v) for v in data.values())
print(f"\n  总计: {total}条数据")

print(f"\n{'=' * 60}")
print(f"✓ 数据提取完成！")
print(f"{'=' * 60}")
print(f"\n输出文件: output/data/")
print(f"JSON文件: cases.json, articles.json, universities.json")
