/**
 * 启航平台 API 性能测试脚本
 * 测试所有核心端点的响应时间（10次取平均值）
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

// 测试端点配置
const endpoints = [
  {
    name: '健康检查',
    method: 'GET',
    path: '/api/health',
    body: null
  },
  {
    name: '公开配置',
    method: 'GET',
    path: '/api/config/public',
    body: null
  },
  {
    name: '公开统计',
    method: 'GET',
    path: '/api/stats/public',
    body: null
  },
  {
    name: '职位列表(分页)',
    method: 'GET',
    path: '/api/jobs?page=1&pageSize=10',
    body: null
  },
  {
    name: '课程列表(分页)',
    method: 'GET',
    path: '/api/courses?page=1&pageSize=10',
    body: null
  },
  {
    name: '导师列表(分页)',
    method: 'GET',
    path: '/api/mentors?page=1&pageSize=10',
    body: null
  },
  {
    name: '用户登录',
    method: 'POST',
    path: '/api/auth/login',
    body: { email: 'admin@qihang.com', password: 'admin123' }
  }
];

// 执行单次请求
function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const startTime = process.hrtime.bigint();

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1000000; // 转换为毫秒

        resolve({
          statusCode: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100, // 保留2位小数
          dataSize: data.length
        });
      });
    });

    req.on('error', reject);

    if (body && (method === 'POST' || method === 'PUT')) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// 对单个端点执行多次测试
async function testEndpoint(endpoint, iterations = 10) {
  console.log(`\n📊 测试端点: ${endpoint.name} (${endpoint.method} ${endpoint.path})`);
  console.log('─'.repeat(60));

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < iterations; i++) {
    try {
      const result = await makeRequest(endpoint.method, endpoint.path, endpoint.body);
      results.push(result);
      if (result.statusCode >= 200 && result.statusCode < 300) {
        successCount++;
      } else {
        errorCount++;
      }
      process.stdout.write(`  第${i + 1}次: ${result.durationMs}ms [HTTP ${result.statusCode}] ${result.dataSize}B\n`);
    } catch (err) {
      errorCount++;
      results.push({ statusCode: 0, durationMs: -1, dataSize: 0 });
      process.stdout.write(`  第${i + 1}次: ERROR - ${err.message}\n`);
    }

    // 间隔50ms避免过于频繁
    if (i < iterations - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // 计算统计数据
  const validResults = results.filter(r => r.durationMs > 0);
  const durations = validResults.map(r => r.durationMs);

  if (durations.length === 0) {
    return {
      endpoint: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      successRate: 0,
      avgMs: 0,
      minMs: 0,
      maxMs: 0,
      p95: 0,
      totalTests: iterations,
      errors: errorCount
    };
  }

  durations.sort((a, b) => a - b);

  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = sum / durations.length;
  const min = durations[0];
  const max = durations[durations.length - 1];
  const p95Index = Math.ceil(durations.length * 0.95) - 1;
  const p95 = durations[Math.min(p95Index, durations.length - 1)];

  const stats = {
    endpoint: endpoint.name,
    method: endpoint.method,
    path: endpoint.path,
    successRate: Math.round((successCount / iterations) * 100),
    avgMs: Math.round(avg * 100) / 100,
    minMs: min,
    maxMs: max,
    p95: Math.round(p95 * 100) / 100,
    totalTests: iterations,
    errors: errorCount
  };

  // 打印汇总
  console.log('\n  📈 统计汇总:');
  console.log(`     成功率: ${stats.successRate}% (${successCount}/${iterations})`);
  console.log(`     平均响应: ${stats.avgMs}ms`);
  console.log(`     最小值: ${stats.minMs}ms`);
  console.log(`     最大值: ${stats.maxMs}ms`);
  console.log(`     P95延迟: ${stats.p95}ms`);

  return stats;
}

// 主测试函数
async function runPerformanceTest() {
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + '  启航平台 API 性能测试报告'.padStart(35).padEnd(66) + '║');
  console.log('║' + `  测试时间: ${new Date().toLocaleString('zh-CN')}`.padEnd(66) + '║');
  console.log('║' + `  目标服务器: ${BASE_URL}`.padEnd(66) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  const allStats = [];

  for (const endpoint of endpoints) {
    const stats = await testEndpoint(endpoint, 10);
    allStats.push(stats);
  }

  // 输出最终报告表格
  console.log('\n\n╔' + '═'.repeat(90) + '╗');
  console.log('║' + '  最终性能测试结果汇总'.padStart(43).padEnd(88) + '║');
  console.log('╠' + '═'.repeat(90) + '╣');
  console.log('║  端点'.padEnd(25) + ' │ 成功率 │ 平均(ms) │ 最小(ms) │ 最大(ms) │ P95(ms) ║');
  console.log('╠' + '─'.repeat(25) + '┼─────────┼──────────┼──────────┼──────────┼─────────╣');

  for (const stats of allStats) {
    const name = stats.endpoint.padEnd(25);
    const success = `${stats.successRate}%`.padStart(7);
    const avg = `${stats.avgMs}`.padStart(8);
    const min = `${stats.minMs}`.padStart(8);
    const max = `${stats.maxMs}`.padStart(8);
    const p95 = `${stats.p95}`.padStart(7);

    console.log(`║ ${name} │ ${success} │ ${avg} │ ${min} │ ${max} │ ${p95} ║`);
  }

  console.log('╚' + '─'.repeat(25) + '┴─────────┴──────────┴──────────┴──────────┴─────────╝');

  // 性能评级
  console.log('\n⚡ 性能评级标准:');
  console.log('   优秀: < 50ms  |  良好: 50-100ms  |  一般: 100-200ms  |  需优化: > 200ms');

  console.log('\n✅ 测试完成!');

  return allStats;
}

// 执行测试
runPerformanceTest()
  .then(stats => {
    // 输出JSON格式供后续分析使用
    console.log('\n\n📋 JSON格式数据:');
    console.log(JSON.stringify(stats, null, 2));
  })
  .catch(err => {
    console.error('❌ 测试失败:', err.message);
    process.exit(1);
  });
