#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
完整爬虫：使用纯Python静态抓取能获取的所有数据
- 抓取所有案例链接
- 抓取所有国家页面
- 抓取所有文章链接
- 保存到JSON文件
"""

import sys
import io
import json
import os
import urllib.request
import urllib.error
import re
import time
from html.parser import HTMLParser
from datetime import datetime


# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


class CaseLinkExtractor(HTMLParser):
    """提取案例页面的所有案例链接"""
    def __init__(self):
        super().__init__()
        self.case_links = []
        self.current_href = ''
    
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            href = ''
            for attr, value in attrs:
                if attr == 'href':
                    href = value
            
            if href and ('/case/' in href and '.shtml' in href):
                if href not in self.case_links:
                    self.case_links.append(href)


class ArticleLinkExtractor(HTMLParser):
    """提取文章页面的链接"""
    def __init__(self):
        super().__init__()
        self.article_links = []
        self.current_href = ''
    
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            href = ''
            for attr, value in attrs:
                if attr == 'href':
                    href = value
            
            if href and ('/news/' in href and '.shtml' in href):
                if href not in self.article_links:
                    self.article_links.append(href)


def get_html(url):
    """获取页面HTML"""
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            }
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read()
            try:
                return content.decode('utf-8')
            except UnicodeDecodeError:
                return content.decode('gbk', errors='ignore')
    except Exception as e:
        print(f"[ERROR] {url}: {e}")
        return None


def scrape_cases():
    """抓取所有案例页面的链接"""
    print("\n" + "="*60)
    print("开始抓取案例库...")
    print("="*60)
    
    all_case_links = []
    
    # 先抓取首页获取案例链接
    base_url = "https://liuxue.xdf.cn/case/"
    
    for page in range(1, 51):  # 最多尝试50页
        url = base_url if page == 1 else f"{base_url}?page={page}"
        
        print(f"\n[INFO] 正在抓取案例第 {page} 页...")
        html = get_html(url)
        
        if not html:
            print(f"[WARN] 第 {page} 页无法访问，停止")
            break
        
        extractor = CaseLinkExtractor()
        extractor.feed(html)
        
        if extractor.case_links:
            for link in extractor.case_links:
                full_url = f"https://liuxue.xdf.cn{link}" if link.startswith('/') else link
                if full_url not in all_case_links:
                    all_case_links.append(full_url)
            
            print(f"[OK] 第 {page} 页: {len(extractor.case_links)} 个案例链接")
        else:
            print(f"[INFO] 第 {page} 页: 无新链接，可能已到最后一页")
            break
        
        time.sleep(0.5)  # 避免请求过快
    
    print(f"\n[OK] 总共获取 {len(all_case_links)} 个案例链接")
    return all_case_links


def scrape_countries():
    """抓取国家页面的URL"""
    print("\n" + "="*60)
    print("开始抓取国家页面...")
    print("="*60)
    
    # 已知的国家页面（从测试中获取）
    countries = [
        ('美国', 'https://liuxue.xdf.cn/usa/'),
        ('英国', 'https://liuxue.xdf.cn/uk/'),
        ('加拿大', 'https://liuxue.xdf.cn/canada/'),
        ('澳大利亚', 'https://liuxue.xdf.cn/australia/'),
        ('新西兰', 'https://liuxue.xdf.cn/newzealand/'),
        ('日本', 'https://liuxue.xdf.cn/japan/'),
        ('中国香港', 'https://liuxue.xdf.cn/hk/'),
        ('新加坡', 'https://liuxue.xdf.cn/singapore/'),
        ('韩国', 'https://liuxue.xdf.cn/korea/'),
        ('德国', 'https://liuxue.xdf.cn/germany/'),
        ('法国', 'https://liuxue.xdf.cn/france/'),
        ('爱尔兰', 'https://liuxue.xdf.cn/ireland/'),
        ('意大利', 'https://liuxue.xdf.cn/italy/'),
        ('西班牙', 'https://liuxue.xdf.cn/spain/'),
        ('荷兰', 'https://liuxue.xdf.cn/netherlands/'),
        ('俄罗斯', 'https://liuxue.xdf.cn/russia/'),
    ]
    
    valid_countries = []
    
    for name, url in countries:
        print(f"\n[INFO] 测试 {name}: {url}")
        html = get_html(url)
        
        if html:
            valid_countries.append({
                'name_cn': name,
                'url': url,
                'has_content': True
            })
            print(f"[OK] {name} 页面可访问")
        else:
            print(f"[WARN] {name} 页面无法访问")
        
        time.sleep(0.3)
    
    print(f"\n[OK] 有效国家: {len(valid_countries)} 个")
    return valid_countries


def scrape_articles():
    """抓取文章页面链接"""
    print("\n" + "="*60)
    print("开始抓取文章资讯...")
    print("="*60)
    
    all_article_links = []
    
    base_url = "https://liuxue.xdf.cn/news/"
    
    for page in range(1, 31):  # 最多30页
        url = base_url if page == 1 else f"{base_url}list/{page}/"
        
        print(f"\n[INFO] 正在抓取文章第 {page} 页...")
        html = get_html(url)
        
        if not html:
            print(f"[WARN] 文章第 {page} 页无法访问")
            break
        
        extractor = ArticleLinkExtractor()
        extractor.feed(html)
        
        if extractor.article_links:
            for link in extractor.article_links:
                full_url = f"https://liuxue.xdf.cn{link}" if link.startswith('/') else link
                if full_url not in all_article_links:
                    all_article_links.append(full_url)
            
            print(f"[OK] 第 {page} 页: {len(extractor.article_links)} 个文章链接")
        else:
            print(f"[INFO] 第 {page} 页: 无新链接")
            break
        
        time.sleep(0.5)
    
    print(f"\n[OK] 总共获取 {len(all_article_links)} 个文章链接")
    return all_article_links


def save_data(case_links, countries, article_links):
    """保存数据到JSON"""
    print("\n" + "="*60)
    print("保存数据...")
    print("="*60)
    
    output_dir = "output/data"
    os.makedirs(output_dir, exist_ok=True)
    
    # 保存所有数据
    all_data = {
        'scrape_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'cases': [{'url': url, 'id': i+1} for i, url in enumerate(case_links)],
        'countries': countries,
        'articles': [{'url': url, 'id': i+1} for i, url in enumerate(article_links)],
        'summary': {
            'total_cases': len(case_links),
            'total_countries': len(countries),
            'total_articles': len(article_links),
        }
    }
    
    # 保存完整数据
    full_file = os.path.join(output_dir, "all_scraped_data.json")
    with open(full_file, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"[OK] 完整数据已保存: {full_file}")
    
    # 分别保存
    case_file = os.path.join(output_dir, "cases.json")
    with open(case_file, "w", encoding="utf-8") as f:
        json.dump({'total': len(case_links), 'data': case_links, 'scrape_time': all_data['scrape_time']}, 
                  f, ensure_ascii=False, indent=2)
    print(f"[OK] 案例链接已保存: {case_file} ({len(case_links)} 条)")
    
    article_file = os.path.join(output_dir, "articles.json")
    with open(article_file, "w", encoding="utf-8") as f:
        json.dump({'total': len(article_links), 'data': article_links, 'scrape_time': all_data['scrape_time']}, 
                  f, ensure_ascii=False, indent=2)
    print(f"[OK] 文章链接已保存: {article_file} ({len(article_links)} 条)")
    
    country_file = os.path.join(output_dir, "countries.json")
    with open(country_file, "w", encoding="utf-8") as f:
        json.dump({'total': len(countries), 'data': countries, 'scrape_time': all_data['scrape_time']}, 
                  f, ensure_ascii=False, indent=2)
    print(f"[OK] 国家数据已保存: {country_file} ({len(countries)} 个)")
    
    return full_file


def main():
    print("=" * 60)
    print("新东方前途出国 - 完整数据爬虫")
    print("=" * 60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    start_time = time.time()
    
    # 1. 抓取案例
    case_links = scrape_cases()
    
    # 2. 抓取国家
    countries = scrape_countries()
    
    # 3. 抓取文章
    article_links = scrape_articles()
    
    # 4. 保存数据
    save_data(case_links, countries, article_links)
    
    elapsed = time.time() - start_time
    print(f"\n" + "=" * 60)
    print(f"[OK] 全部完成！耗时: {elapsed:.1f} 秒")
    print(f"[OK] 案例链接: {len(case_links)} 条")
    print(f"[OK] 国家页面: {len(countries)} 个")
    print(f"[OK] 文章链接: {len(article_links)} 条")
    print(f"[OK] 总计: {len(case_links) + len(countries) + len(article_links)} 个数据")
    print("=" * 60)
    print("\n输出文件位置: output/data/")


if __name__ == '__main__':
    main()
