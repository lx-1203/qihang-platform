import re

# ResumePool.tsx - unused FeatureStatus
with open('frontend/src/pages/company/ResumePool.tsx', 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace("import FeatureStatus from '@/components/FeatureStatus';\n", "")
with open('frontend/src/pages/company/ResumePool.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

# DevNav.tsx - any type
with open('frontend/src/pages/DevNav.tsx', 'r', encoding='utf-8') as f:
    code = f.read()
code = code.replace("} catch (err: any) {", "} catch (err: unknown) {")
with open('frontend/src/pages/DevNav.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed lint")
