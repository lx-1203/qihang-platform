#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
第二步：测试案例详情页和国家页面
"""

import sys
import io
import urllib.request
import urllib.error
import re
from html.parser import HTMLParser


# 设置输出编码为UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


class DetailExtractor(HTMLParser):
    """提取案例详情"""
    def __init__(self):
        super().__init__()
        self.data = {
            'title': '',
            'university': '',
            'major': '',
            'student_info': '',
            'consultant': '',
            'difficulty': '',
            'solution': '',
        }
        self.in_title = False
        self.in_content = False
    
    def handle_starttag(self, tag, attrs):
        # 检查是否有class属性
        attrs_dict = dict(attrs)
        cls = attrs_dict.get('class', '')
        
        # 查找标题
        if tag in ['h1', 'h2', 'div'] and ('title' in cls.lower() or 'head' in cls.lower()):
            self.in_title = True
        
        # 查找内容区域
        if tag in ['div', 'section'] and ('content' in cls.lower() or 'detail' in cls.lower()):
            self.in_content = True
    
    def handle_endtag(self, tag):
        self.in_title = False
        self.in_content = False
    
    def handle_data(self, data):
        if self.in_title:
            self.data['title'] += data.strip()


def test_case_detail(url):
    """测试案例详情页"""
    print("\n" + "="*60)
    print(f"测试案例详情页: {url}")
    print("="*60)
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            content = response.read()
            try:
                html = content.decode('utf-8')
            except UnicodeDecodeError:
                html = content.decode('gbk', errors='ignore')
            
            print(f"[OK] 页面获取成功，大小: {len(html)} 字符")
            
            # 简单的文本提取
            if '录取' in html or 'offer' in html.lower():
                print("[OK] 找到录取信息")
            
            # 查找关键信息
            keywords = ['大学', '学院', '专业', 'GPA', '托福', '雅思', '顾问', '背景']
            for keyword in keywords:
                if keyword in html:
                    print(f"[OK] 找到关键词: {keyword}")
            
            # 保存HTML样本
            with open("sample_case.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("[OK] 保存样本到: sample_case.html")
            
            return html
            
    except Exception as e:
        print(f"[ERROR] {e}")
        return None


def find_country_urls():
    """查找正确的国家页面URL"""
    print("\n" + "="*60)
    print("查找正确的国家页面URL")
    print("="*60)
    
    # 从首页提取
    base_url = "https://liuxue.xdf.cn/"
    
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
            
            # 使用正则查找国家链接
            # 查找 href 中包含国家名的链接
            patterns = [
                r'href="([^"]*usa[^"]*)"',
                r'href="([^"]*america[^"]*)"',
                r'href="([^"]*uk[^"]*)"',
                r'href="([^"]*britain[^"]*)"',
                r'href="([^"]*canada[^"]*)"',
            ]
            
            found_urls = []
            for pattern in patterns:
                matches = re.findall(pattern, html, re.IGNORECASE)
                if matches:
                    for match in matches:
                        if match not in found_urls:
                            found_urls.append(match)
            
            print(f"[INFO] 找到 {len(found_urls)} 个国家链接:")
            for url in found_urls[:10]:
                if url.startswith('/'):
                    print(f"  - https://liuxue.xdf.cn{url}")
                else:
                    print(f"  - {url}")
            
            # 测试这些链接
            if found_urls:
                test_url = found_urls[0]
                if test_url.startswith('/'):
                    test_url = f"https://liuxue.xdf.cn{test_url}"
                print(f"\n[INFO] 测试第一个链接: {test_url}")
                test_country_page(test_url)
            
            return found_urls
            
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return []


def test_country_page(url):
    """测试国家页面"""
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        )
        
        with urllib.request.urlopen(req, timeout=30) as response:
            if response.status == 200:
                print(f"[OK] 国家页面可访问: {url}")
                return True
            else:
                print(f"[ERROR] 状态码: {response.status}")
                return False
    except Exception as e:
        print(f"[ERROR] 无法访问: {e}")
        return False


def main():
    print("=" * 60)
    print("第二步：案例详情和国家URL测试")
    print("=" * 60)
    
    # 1. 测试一个案例详情页
    test_url = "https://liuxue.xdf.cn/case/7912611.shtml"
    test_case_detail(test_url)
    
    # 2. 查找国家URL
    find_country_urls()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)


if __name__ == '__main__':
    main()
