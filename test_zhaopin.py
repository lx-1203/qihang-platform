#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试访问新东方招聘网站
https://zhaopin.xdf.cn/
"""

import sys
import io
import urllib.request
import urllib.error
import time

# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_website():
    """测试访问网站"""
    base_url = "https://zhaopin.xdf.cn/"
    
    print("=" * 60)
    print("测试访问新东方招聘网站")
    print(f"目标网址: {base_url}")
    print("=" * 60)
    
    try:
        req = urllib.request.Request(
            base_url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            }
        )
        
        print(f"\n[INFO] 正在发送请求...")
        start_time = time.time()
        
        with urllib.request.urlopen(req, timeout=30) as response:
            elapsed = time.time() - start_time
            
            print(f"[OK] 请求成功！耗时: {elapsed:.2f} 秒")
            print(f"[OK] 状态码: {response.status}")
            print(f"[OK] Content-Type: {response.getheader('Content-Type', 'N/A')}")
            
            content = response.read()
            
            try:
                html = content.decode('utf-8')
                print(f"[OK] 使用UTF-8解码成功")
            except UnicodeDecodeError:
                try:
                    html = content.decode('gbk', errors='ignore')
                    print(f"[OK] 使用GBK解码成功")
                except Exception as e:
                    print(f"[ERROR] 解码失败: {e}")
                    return None
            
            print(f"\n[INFO] 页面大小: {len(html)} 字符")
            
            # 保存HTML用于分析
            with open('sample_zhaopin.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"[OK] HTML已保存到: sample_zhaopin.html")
            
            # 简单分析页面内容
            print("\n" + "=" * 60)
            print("页面初步分析:")
            print("=" * 60)
            
            if '<title' in html:
                title_start = html.find('<title') + len('<title>')
                title_end = html.find('</title>')
                if title_end > title_start:
                    title = html[title_start:title_end].strip()
                    print(f"[INFO] 页面标题: {title}")
            
            # 查找链接
            import re
            links = re.findall(r'href=["\']([^"\']+)["\']', html)
            print(f"[INFO] 找到 {len(links)} 个链接")
            
            # 查找职位相关链接
            job_links = [link for link in links if any(keyword in link.lower() for keyword in ['job', 'position', 'career', 'zhaopin', 'recruit'])]
            if job_links:
                print(f"[INFO] 找到 {len(job_links)} 个职位相关链接:")
                for link in job_links[:10]:
                    print(f"  - {link}")
            
            return html
            
    except urllib.error.HTTPError as e:
        print(f"[ERROR] HTTP错误: {e.code} - {e.reason}")
        return None
    except urllib.error.URLError as e:
        print(f"[ERROR] URL错误: {e.reason}")
        return None
    except Exception as e:
        print(f"[ERROR] 未知错误: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    test_website()
