#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
检查返回200的API响应内容
"""

import sys
import io
import urllib.request
import urllib.error

# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def check_api(url):
    """检查API响应"""
    print(f"\n{'='*60}")
    print(f"检查: {url}")
    print('='*60)
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://zhaopin.xdf.cn/',
            }
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read()
            
            print(f"[OK] 状态码: {response.status}")
            print(f"[OK] Content-Type: {response.getheader('Content-Type', 'N/A')}")
            print(f"[OK] 内容长度: {len(content)} 字节")
            
            # 尝试解码
            try:
                text = content.decode('utf-8')
                print(f"\n[INFO] 前500字符:\n{text[:500]}")
            except:
                try:
                    text = content.decode('gbk', errors='ignore')
                    print(f"\n[INFO] 前500字符(GBK):\n{text[:500]}")
                except:
                    print(f"\n[INFO] 原始数据(前100字节): {content[:100]}")
            
            # 保存原始响应
            filename = url.replace('https://', '').replace('http://', '').replace('/', '_').replace('?', '_') + '.txt'
            with open(filename, 'wb') as f:
                f.write(content)
            print(f"\n[OK] 已保存到: {filename}")
            
            return content
            
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    portal_id = '7c3dc067-fa3c-49bb-b8fc-d23e09039a6a'
    
    urls = [
        f'https://zhaopin.xdf.cn/api/recruitment/position/list?portalId={portal_id}',
        'https://zhaopin.xdf.cn/portal/api/position/list',
        'https://zhaopin.xdf.cn/beisen/api/position/list',
    ]
    
    for url in urls:
        check_api(url)
