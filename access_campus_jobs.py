#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
访问校园招聘页面并分析
https://zhaopin.xdf.cn/campus/jobs
"""

import sys
import io
import urllib.request
import urllib.error
import time
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def access_campus_page():
    """访问校园招聘页面"""
    url = "https://zhaopin.xdf.cn/campus/jobs"
    
    print("=" * 80)
    print("访问校园招聘页面")
    print(f"目标网址: {url}")
    print("=" * 80)
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://zhaopin.xdf.cn/',
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
            
            # 保存HTML
            with open('campus_jobs_page.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print(f"[OK] HTML已保存到: campus_jobs_page.html")
            
            # 分析页面内容
            print("\n" + "=" * 80)
            print("页面分析:")
            print("=" * 80)
            
            # 查找职位数量
            total_match = re.search(r'共\s*(\d+)\s*个', html)
            if total_match:
                print(f"[INFO] 职位总数: {total_match.group(1)} 个")
            
            # 查找职位信息
            job_patterns = [
                r'([\u4e00-\u9fa5]+-[\u4e00-\u9fa5]+-[A-Za-z0-9]+)',
                r'([A-Z]\d+)',
            ]
            
            job_ids = re.findall(r'[A-Z]\d{5,}', html)
            if job_ids:
                print(f"[INFO] 找到 {len(job_ids)} 个职位ID")
                print(f"[INFO] 前10个职位ID: {job_ids[:10]}")
            
            # 查找分页信息
            page_match = re.search(r'page[=\-_]?(\d+)', html.lower())
            if page_match:
                print(f"[INFO] 找到分页参数: page={page_match.group(1)}")
            
            # 查找script数据
            script_match = re.search(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
            if script_match:
                print(f"[INFO] 找到script标签，尝试提取数据...")
                
                # 查找JSON数据
                json_matches = re.findall(r'(\{[^}]+\})', script_match.group(1))
                print(f"[INFO] 找到 {len(json_matches)} 个可能的JSON对象")
            
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
    access_campus_page()
