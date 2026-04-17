#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
第一步测试：检查网站是否可访问
使用Python内置urllib，无需第三方库
"""

import sys
import io
import urllib.request
import urllib.error
import time
from html.parser import HTMLParser


# 设置输出编码为UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')


class LinkExtractor(HTMLParser):
    """简单的HTML链接提取器"""
    def __init__(self):
        super().__init__()
        self.links = []
        self.case_links = []
        self.uni_links = []
    
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            for attr, value in attrs:
                if attr == 'href':
                    self.links.append(value)
                    if '/case/' in value:
                        self.case_links.append(value)
                    if '/school/' in value:
                        self.uni_links.append(value)


def test_url(url):
    """测试单个URL"""
    print("\n" + "="*60)
    print(f"测试URL: {url}")
    print("="*60)
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            }
        )
        
        start_time = time.time()
        with urllib.request.urlopen(req, timeout=30) as response:
            elapsed = time.time() - start_time
            
            print("[OK] 连接成功")
            print(f"  状态码: {response.status}")
            print(f"  响应时间: {elapsed:.2f}秒")
            print(f"  Content-Type: {response.getheader('Content-Type')}")
            
            content = response.read()
            try:
                html = content.decode('utf-8')
            except UnicodeDecodeError:
                html = content.decode('gbk', errors='ignore')
            
            print(f"  页面大小: {len(html)} 字符")
            
            # 提取链接
            extractor = LinkExtractor()
            extractor.feed(html)
            
            print(f"\n[INFO] 链接统计:")
            print(f"  总链接数: {len(extractor.links)}")
            print(f"  案例链接: {len(extractor.case_links)}")
            print(f"  院校链接: {len(extractor.uni_links)}")
            
            if extractor.case_links:
                print(f"\n[INFO] 前5个案例链接:")
                for i, link in enumerate(extractor.case_links[:5]):
                    print(f"  {i+1}. {link}")
            
            if extractor.uni_links:
                print(f"\n[INFO] 前5个院校链接:")
                for i, link in enumerate(extractor.uni_links[:5]):
                    print(f"  {i+1}. {link}")
            
            # 检查页面中是否有JavaScript内容
            has_js = 'script' in html.lower()
            has_case = 'case' in html.lower() or '案例' in html
            has_university = 'university' in html.lower() or '大学' in html
            
            if has_js:
                print(f"\n[WARN] 检测到JavaScript，可能需要浏览器渲染")
            if has_case:
                print(f"[OK] 页面包含案例内容")
            if has_university:
                print(f"[OK] 页面包含院校内容")
            
            return html
            
    except urllib.error.HTTPError as e:
        print(f"[ERROR] HTTP错误: {e.code}")
        return None
    except urllib.error.URLError as e:
        print(f"[ERROR] URL错误: {e.reason}")
        return None
    except Exception as e:
        print(f"[ERROR] 错误: {e}")
        import traceback
        traceback.print_exc()
        return None


def main():
    print("=" * 60)
    print("新东方前途出国 - 网站可访问性测试")
    print("=" * 60)
    
    # 测试各个URL
    test_urls = [
        'https://goabroad.xdf.cn/',
        'https://liuxue.xdf.cn/',
        'https://liuxue.xdf.cn/case/',
        'https://liuxue.xdf.cn/USA/',
        'https://liuxue.xdf.cn/UK/',
        'https://liuxue.xdf.cn/news/',
    ]
    
    results = {}
    for url in test_urls:
        results[url] = test_url(url)
    
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    for url, result in results.items():
        status = "[OK] 成功" if result else "[ERROR] 失败"
        print(f"{url}: {status}")


if __name__ == '__main__':
    main()
