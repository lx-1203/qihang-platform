const fs = require('fs');

let code = fs.readFileSync('backend/routes/admin.js', 'utf8');

// We want to replace the stats response
const newStatsRes = `
    const activeCount = statusRows.find(s => s.status === 1)?.count || 0;
    const disabledCount = statusRows.find(s => s.status === 0)?.count || 0;

    const jobsCount = jobsCountRows[0].total;
    const coursesCount = coursesCountRows[0].total;
    const mentorsCount = mentorsCountRows[0].total;

    // 获取各种待审核数量和企业数等
    const [[companiesCountRows], [pendingCompaniesRows], [pendingMentorsRows], [todayResumeRows], [totalAppointmentsRows]] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'company'"),
      pool.query("SELECT COUNT(*) AS total FROM companies WHERE audit_status = 'pending'"),
      pool.query("SELECT COUNT(*) AS total FROM mentor_profiles WHERE audit_status = 'pending'"),
      pool.query("SELECT COUNT(*) AS total FROM resumes WHERE DATE(created_at) = CURDATE()"),
      pool.query("SELECT COUNT(*) AS total FROM appointments")
    ]);

    res.json({
      code: 200,
      data: {
        totalUsers: totalRows[0].total,
        onlineJobs: jobsCount,
        totalCourses: coursesCount,
        totalCompanies: companiesCountRows[0].total,
        certifiedMentors: mentorsCount,
        totalAppointments: totalAppointmentsRows[0].total,
        todayRegister: todayRows[0].count,
        todayResume: todayResumeRows[0].total,
        weekActive: Math.floor(totalRows[0].total * 0.8), // 模拟数据
        pendingCompanies: pendingCompaniesRows[0].total,
        pendingMentors: pendingMentorsRows[0].total,
        pendingReports: 0,
        roleDistribution: roleDistribution,
        regTrend: trendRows.map(row => row.count)
      },
    });
`;

code = code.replace(/const activeCount = statusRows\.find[\s\S]*?res\.json\(\{[\s\S]*?\}\);\s*\} catch \(err\) \{/, newStatsRes + '\  } catch (err) {');
fs.writeFileSync('backend/routes/admin.js', code);
console.log('Patched');
