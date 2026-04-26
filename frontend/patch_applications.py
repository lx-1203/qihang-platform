import re

with open('frontend/src/pages/student/MyApplications.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = """        const list = Array.isArray(raw.list)
          ? raw.list
          : Array.isArray(raw.resumes)
            ? raw.resumes
            : Array.isArray(raw)
              ? raw
              : [];
        const normalized = list.map((r: any) => ({
          ...r,
          jobTitle: r.job_title || r.jobTitle || '',
          companyName: r.company_name || r.companyName || '',
          companyLogo: r.company_logo || r.companyLogo || '',
          jobType: r.job_type || r.jobType || '',
          appliedAt: r.created_at || r.appliedAt || '',
          statusUpdatedAt: r.updated_at || r.statusUpdatedAt || ''
        }));
        setApplications(normalized);"""

code = re.sub(r'const list = Array\.isArray\(raw\.list\).*?setApplications\(list\);', replacement, code, flags=re.DOTALL)

with open('frontend/src/pages/student/MyApplications.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched MyApplications")
