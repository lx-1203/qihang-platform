#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
查找Beisen招聘系统的真实API端点
基于Beisen招聘系统的常见模式
"""

import sys
import io
import json
import urllib.request
import urllib.error
import time

# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_beisen_api_patterns():
    """测试Beisen招聘系统的真实API模式"""
    print("=" * 60)
    print("测试Beisen招聘系统API模式")
    print("=" * 60)
    
    portal_id = '7c3dc067-fa3c-49bb-b8fc-d23e09039a6a'
    
    # Beisen系统常见的API端点
    endpoints = [
        # 职位列表API
        '/api/recruitment/position/getPositionList',
        '/api/position/getList',
        '/api/recruitment/job/getJobList',
        '/api/job/getList',
        
        # 带PortalId的
        f'/api/recruitment/position/getPositionList?portalId={portal_id}',
        f'/api/position/getList?portalId={portal_id}',
        
        # POST请求的端点
        '/api/recruitment/position/search',
        '/api/position/search',
        '/api/recruitment/job/search',
        
        # Beisen特有端点
        '/beisen/api/recruitment/position/list',
        '/beisen/api/position/list',
        '/beisen/recruitment/api/position/list',
        
        # 其他可能的模式
        '/api/v1/position/list',
        '/api/v2/position/list',
        '/recruitment/api/position/list',
    ]
    
    base_url = 'https://zhaopin.xdf.cn'
    
    for endpoint in endpoints:
        url = base_url + endpoint
        print(f"\n[INFO] 测试: {url}")
        
        try:
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://zhaopin.xdf.cn/',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            )
            
            start_time = time.time()
            with urllib.request.urlopen(req, timeout=10) as response:
                elapsed = time.time() - start_time
                
                if response.status == 200:
                    content = response.read()
                    content_type = response.getheader('Content-Type', '')
                    
                    print(f"  [OK] 状态码: 200, 耗时: {elapsed:.2f}秒")
                    print(f"  [OK] Content-Type: {content_type}")
                    
                    if 'json' in content_type.lower():
                        try:
                            data = json.loads(content.decode('utf-8'))
                            print(f"  [OK] 成功获取JSON数据!")
                            print(f"  [INFO] 数据结构: {type(data)}")
                            
                            # 保存
                            filename = f'api_success_{endpoint.replace("/", "_")}.json'
                            with open(filename, 'w', encoding='utf-8') as f:
                                json.dump(data, f, ensure_ascii=False, indent=2)
                            print(f"  [OK] 已保存到: {filename}")
                            
                            return data
                        except Exception as e:
                            print(f"  [WARN] JSON解析失败: {e}")
                    else:
                        print(f"  [INFO] 不是JSON响应")
                else:
                    print(f"  [WARN] 状态码: {response.status}")
                    
        except urllib.error.HTTPError as e:
            print(f"  [ERROR] HTTP错误: {e.code}")
        except Exception as e:
            print(f"  [ERROR] {e}")
    
    return None

def test_post_requests():
    """测试POST请求"""
    print("\n" + "=" * 60)
    print("测试POST请求")
    print("=" * 60)
    
    portal_id = '7c3dc067-fa3c-49bb-b8fc-d23e09039a6a'
    
    post_endpoints = [
        '/api/recruitment/position/search',
        '/api/position/search',
        '/api/recruitment/position/getPositionList',
    ]
    
    base_url = 'https://zhaopin.xdf.cn'
    
    for endpoint in post_endpoints:
        url = base_url + endpoint
        print(f"\n[INFO] 测试POST: {url}")
        
        try:
            post_data = json.dumps({
                'portalId': portal_id,
                'pageIndex': 1,
                'pageSize': 20,
            }).encode('utf-8')
            
            req = urllib.request.Request(
                url,
                data=post_data,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'Referer': 'https://zhaopin.xdf.cn/',
                }
            )
            
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    content = response.read()
                    content_type = response.getheader('Content-Type', '')
                    
                    print(f"  [OK] 状态码: 200")
                    print(f"  [OK] Content-Type: {content_type}")
                    
                    if 'json' in content_type.lower():
                        try:
                            data = json.loads(content.decode('utf-8'))
                            print(f"  [OK] 成功获取JSON数据!")
                            
                            filename = f'post_success_{endpoint.replace("/", "_")}.json'
                            with open(filename, 'w', encoding='utf-8') as f:
                                json.dump(data, f, ensure_ascii=False, indent=2)
                            print(f"  [OK] 已保存到: {filename}")
                            
                            return data
                        except Exception as e:
                            print(f"  [WARN] JSON解析失败: {e}")
                    
        except Exception as e:
            print(f"  [ERROR] {e}")
    
    return None

if __name__ == '__main__':
    data = test_beisen_api_patterns()
    if not data:
        test_post_requests()
