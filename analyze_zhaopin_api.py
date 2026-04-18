#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
分析新东方招聘网站的API接口
"""

import sys
import io
import json
import urllib.request
import urllib.error
import time
import re

# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def extract_bsglobal():
    """从HTML中提取BSGlobal配置"""
    print("=" * 60)
    print("提取BSGlobal配置")
    print("=" * 60)
    
    try:
        with open('sample_zhaopin.html', 'r', encoding='utf-8') as f:
            html = f.read()
        
        # 查找BSGlobal
        bsglobal_match = re.search(r'var BSGlobal\s*=\s*({.*?});', html, re.DOTALL)
        if bsglobal_match:
            bsglobal_json = bsglobal_match.group(1)
            print("[OK] 找到BSGlobal配置")
            
            # 尝试解析
            try:
                bsglobal = json.loads(bsglobal_json)
                print(f"\n[INFO] PortalId: {bsglobal.get('PortalId', 'N/A')}")
                print(f"[INFO] Key: {bsglobal.get('Key', 'N/A')}")
                print(f"[INFO] Name: {bsglobal.get('Name', 'N/A')}")
                
                # 查找导航
                navigations = bsglobal.get('Navigations', [])
                print(f"\n[INFO] 找到 {len(navigations)} 个导航项:")
                for nav in navigations:
                    print(f"  - {nav.get('Name', 'N/A')} (PageId: {nav.get('PageId', 'N/A')})")
                
                return bsglobal
            except json.JSONDecodeError as e:
                print(f"[ERROR] JSON解析失败: {e}")
                return None
        else:
            print("[ERROR] 未找到BSGlobal")
            return None
            
    except Exception as e:
        print(f"[ERROR] {e}")
        return None

def test_api_endpoints(bsglobal):
    """测试常见的API端点"""
    print("\n" + "=" * 60)
    print("测试常见API端点")
    print("=" * 60)
    
    base_url = "https://zhaopin.xdf.cn"
    portal_id = bsglobal.get('PortalId', '') if bsglobal else ''
    
    endpoints = [
        '/api/job/list',
        '/api/position/list',
        '/recruitment/position/list',
        f'/api/recruitment/position/list?portalId={portal_id}',
        '/api/position/search',
        '/api/job/search',
        '/portal/api/position/list',
        '/beisen/api/position/list',
        '/api/recruitment/job/list',
    ]
    
    for endpoint in endpoints:
        url = base_url + endpoint
        print(f"\n[INFO] 测试: {url}")
        
        try:
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://zhaopin.xdf.cn/',
                }
            )
            
            start_time = time.time()
            with urllib.request.urlopen(req, timeout=10) as response:
                elapsed = time.time() - start_time
                
                if response.status == 200:
                    content = response.read()
                    print(f"  [OK] 状态码: 200, 耗时: {elapsed:.2f}秒")
                    
                    try:
                        data = json.loads(content.decode('utf-8'))
                        print(f"  [INFO] 响应是JSON格式")
                        print(f"  [INFO] 数据类型: {type(data)}")
                        
                        # 保存
                        with open(f'api_test_{endpoint.replace("/", "_")}.json', 'w', encoding='utf-8') as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)
                        print(f"  [OK] 已保存到文件")
                    except:
                        print(f"  [INFO] 响应不是JSON格式")
                else:
                    print(f"  [WARN] 状态码: {response.status}")
                    
        except urllib.error.HTTPError as e:
            print(f"  [ERROR] HTTP错误: {e.code}")
        except Exception as e:
            print(f"  [ERROR] {e}")

def analyze_network_calls():
    """分析可能的网络调用模式"""
    print("\n" + "=" * 60)
    print("分析可能的API调用模式")
    print("=" * 60)
    
    # 基于Beisen招聘系统的常见模式
    print("\n[INFO] Beisen招聘系统常见API模式:")
    print("  - /api/recruitment/position/list")
    print("  - /api/position/search")
    print("  - /beisen/api/position")
    print("  - /portal/api/position")
    
    print("\n[INFO] 尝试构建完整的爬虫方案...")

if __name__ == '__main__':
    bsglobal = extract_bsglobal()
    if bsglobal:
        test_api_endpoints(bsglobal)
    analyze_network_calls()
