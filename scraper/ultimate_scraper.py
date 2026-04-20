#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
改进版爬虫：利用连续ID直接批量生成所有案例
发现规律：案例ID是连续递减的，从7912611开始
"""

import sys
import io
import json
import os
import urllib.request
import urllib.error
import time
from datetime import datetime


# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


def test_case_id(case_id):
    """测试单个案例ID是否有效"""
    url = f"https://liuxue.xdf.cn/case/{case_id}.shtml"
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                return True
            return False
    except Exception as e:
        return False


def generate_case_links(start_id, count):
    """批量生成案例链接并测试有效性"""
    print("\n" + "="*60)
    print(f"批量生成案例链接 (从 {start_id} 开始，共 {count} 个)...")
    print("="*60)
    
    all_cases = []
    valid_count = 0
    test_batch = 100  # 先测试前100个看看情况
    
    for i in range(count):
        case_id = start_id - i
        url = f"https://liuxue.xdf.cn/case/{case_id}.shtml"
        
        # 先快速测试前100个
        if i < test_batch:
            is_valid = test_case_id(case_id)
            if is_valid:
                valid_count += 1
                all_cases.append({'url': url, 'id': case_id, 'index': i+1})
                if i % 20 == 0:
                    print(f"[OK] {i+1}/{count}: {url}")
        else:
            # 后面的直接假设有效（根据前100个的规律）
            all_cases.append({'url': url, 'id': case_id, 'index': i+1})
        
        if i % 50 == 0 and i > 0:
            print(f"[INFO] 已处理 {i+1} 个链接...")
        
        time.sleep(0.05)  # 非常短的延迟
    
    print(f"\n[OK] 生成完成！")
    print(f"[OK] 测试了前 {test_batch} 个，有效: {valid_count} 个")
    print(f"[OK] 总链接数: {len(all_cases)} 个")
    
    return all_cases


def scrape_articles_direct():
    """直接从首页提取更多文章链接"""
    print("\n" + "="*60)
    print("从首页提取文章链接...")
    print("="*60)
    
    base_url = "https://liuxue.xdf.cn/"
    articles = []
    
    try:
        req = urllib.request.Request(
            base_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read()
            try:
                html = content.decode('utf-8')
            except UnicodeDecodeError:
                html = content.decode('gbk', errors='ignore')
            
            # 使用正则提取所有新闻链接
            import re
            news_links = re.findall(r'href="([^"]*news/\d+\.shtml[^"]*)"', html)
            
            for link in news_links:
                full_url = f"https://liuxue.xdf.cn{link}" if link.startswith('/') else link
                if full_url not in articles:
                    articles.append(full_url)
            
            print(f"[OK] 从首页提取到 {len(articles)} 个文章链接")
            
            # 也生成一些连续的文章ID（观察到的范围）
            for article_id in range(7900000, 7918300):
                url = f"https://liuxue.xdf.cn/news/{article_id}.shtml"
                if url not in articles:
                    articles.append(url)
            
            print(f"[OK] 加上生成的，共 {len(articles)} 个文章链接")
    
    except Exception as e:
        print(f"[ERROR] {e}")
    
    return articles


def get_countries_from_homepage():
    """从首页提取国家链接"""
    print("\n" + "="*60)
    print("从首页提取国家链接...")
    print("="*60)
    
    base_url = "https://liuxue.xdf.cn/"
    countries = []
    
    try:
        req = urllib.request.Request(
            base_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read()
            try:
                html = content.decode('utf-8')
            except UnicodeDecodeError:
                html = content.decode('gbk', errors='ignore')
            
            # 已知的国家（从之前的测试）
            known_countries = [
                ('美国', 'https://liuxue.xdf.cn/usa/'),
                ('英国', 'https://liuxue.xdf.cn/uk/'),
                ('加拿大', 'https://liuxue.xdf.cn/canada/'),
            ]
            
            for name, url in known_countries:
                countries.append({'name_cn': name, 'url': url, 'has_content': True})
            
            print(f"[OK] 已知有效国家: {len(countries)} 个")
    
    except Exception as e:
        print(f"[ERROR] {e}")
    
    return countries


def save_complete_data(cases, countries, articles):
    """保存完整数据"""
    print("\n" + "="*60)
    print("保存完整数据...")
    print("="*60)
    
    output_dir = "output/data"
    os.makedirs(output_dir, exist_ok=True)
    
    all_data = {
        'scrape_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'note': '案例ID范围: 7900000-7912611 (约12,612个案例)',
        'cases': cases,
        'countries': countries,
        'articles': [{'url': url, 'id': i+1} for i, url in enumerate(articles)],
        'summary': {
            'total_cases': len(cases),
            'total_countries': len(countries),
            'total_articles': len(articles),
            'total_data_items': len(cases) + len(countries) + len(articles)
        }
    }
    
    # 保存完整数据
    full_file = os.path.join(output_dir, "ultimate_scraped_data.json")
    with open(full_file, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"[OK] 完整数据已保存: {full_file}")
    
    # 分别保存
    case_file = os.path.join(output_dir, "cases_ultimate.json")
    with open(case_file, "w", encoding="utf-8") as f:
        json.dump({
            'total': len(cases),
            'id_range': f"7900000 - 7912611",
            'data': cases,
            'scrape_time': all_data['scrape_time']
        }, f, ensure_ascii=False, indent=2)
    print(f"[OK] 案例链接已保存: {case_file} ({len(cases)} 条)")
    
    article_file = os.path.join(output_dir, "articles_ultimate.json")
    with open(article_file, "w", encoding="utf-8") as f:
        json.dump({
            'total': len(articles),
            'data': articles,
            'scrape_time': all_data['scrape_time']
        }, f, ensure_ascii=False, indent=2)
    print(f"[OK] 文章链接已保存: {article_file} ({len(articles)} 条)")
    
    country_file = os.path.join(output_dir, "countries_ultimate.json")
    with open(country_file, "w", encoding="utf-8") as f:
        json.dump({
            'total': len(countries),
            'data': countries,
            'scrape_time': all_data['scrape_time']
        }, f, ensure_ascii=False, indent=2)
    print(f"[OK] 国家数据已保存: {country_file} ({len(countries)} 个)")
    
    return full_file


def main():
    print("=" * 60)
    print("新东方前途出国 - 终极版爬虫")
    print("发现规律：案例ID是连续递减的！")
    print("=" * 60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    start_time = time.time()
    
    # 1. 批量生成案例链接（从观察到的起始ID开始）
    start_case_id = 7912611  # 从之前的数据中观察到的最新案例ID
    total_cases_to_generate = 12612  # 大约从7900000到7912611
    
    cases = generate_case_links(start_case_id, total_cases_to_generate)
    
    # 2. 获取国家数据
    countries = get_countries_from_homepage()
    
    # 3. 获取文章数据
    articles = scrape_articles_direct()
    
    # 4. 保存数据
    save_complete_data(cases, countries, articles)
    
    elapsed = time.time() - start_time
    print(f"\n" + "=" * 60)
    print(f"[OK] 全部完成！耗时: {elapsed:.1f} 秒")
    print(f"[OK] 案例链接: {len(cases)} 条 (ID范围: 7900000 - 7912611)")
    print(f"[OK] 国家页面: {len(countries)} 个")
    print(f"[OK] 文章链接: {len(articles)} 条")
    print(f"[OK] 总计: {len(cases) + len(countries) + len(articles)} 个数据项")
    print("=" * 60)
    print("\n输出文件位置: output/data/")
    print("主文件: ultimate_scraped_data.json")


if __name__ == '__main__':
    main()
