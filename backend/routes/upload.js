/**
 * 文件上传路由
 *
 * 路由前缀: /api/upload
 *
 * POST /api/upload          - 上传单个文件（头像/简历/课程封面等）
 * POST /api/upload/multiple - 上传多个文件
 *
 * 支持的文件类型:
 *   - 图片: jpg, jpeg, png, gif, webp (最大 5MB)
 *   - 文档: pdf, doc, docx (最大 10MB)
 *
 * 上传后文件存储在 backend/uploads/ 目录
 * 访问路径: /uploads/filename
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ====== 文件签名验证 — Magic Bytes（SEC-007）======
// 防止攻击者伪造 mimetype 上传恶意文件
const MAGIC_BYTES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/jpg':  [0xFF, 0xD8, 0xFF],
  'image/png':  [0x89, 0x50, 0x4E, 0x47],
  'image/gif':  [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
};

function validateFileSignature(filePath, mimetype) {
  const expected = MAGIC_BYTES[mimetype];
  if (!expected) return true; // doc/docx 等 ZIP 格式，跳过签名验证
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    return expected.every((byte, i) => buffer[i] === byte);
  } catch {
    return false;
  }
}

// 确保 uploads 目录存在
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const RESUME_DIR = path.join(UPLOAD_DIR, 'resumes');
const COVER_DIR = path.join(UPLOAD_DIR, 'covers');
const GENERAL_DIR = path.join(UPLOAD_DIR, 'general');

[UPLOAD_DIR, AVATAR_DIR, RESUME_DIR, COVER_DIR, GENERAL_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 文件类型配置
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024;   // 10MB

/**
 * 根据上传类别获取对应存储目录
 */
function getDestination(category) {
  switch (category) {
    case 'avatar': return AVATAR_DIR;
    case 'resume': return RESUME_DIR;
    case 'cover': return COVER_DIR;
    default: return GENERAL_DIR;
  }
}

/**
 * 生成唯一文件名: userId_timestamp_random.ext
 */
function generateFilename(userId, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}_${timestamp}_${random}${ext}`;
}

// Multer 存储配置
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const category = req.body.category || req.query.category || 'general';
    const dest = getDestination(category);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'anon';
    cb(null, generateFilename(userId, file.originalname));
  },
});

// 文件过滤器
const fileFilter = (_req, file, cb) => {
  if (ALL_ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}。支持的类型: jpg, png, gif, webp, pdf, doc, docx`), false);
  }
};

// 创建 multer 实例
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_DOC_SIZE, // 使用最大限制，后续按类型校验
  },
});

// ==================== 单文件上传 ====================
router.post('/', authMiddleware, (req, res) => {
  const singleUpload = upload.single('file');

  singleUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ code: 400, message: '文件大小超过限制（图片最大5MB，文档最大10MB）' });
        }
        return res.status(400).json({ code: 400, message: `上传错误: ${err.message}` });
      }
      return res.status(400).json({ code: 400, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ code: 400, message: '请选择要上传的文件' });
    }

    const file = req.file;

    // 文件签名验证 — 防止伪造 mimetype（SEC-007）
    if (!validateFileSignature(file.path, file.mimetype)) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ code: 400, message: '文件内容与声明的类型不匹配，请上传真实文件' });
    }

    // 按类型校验文件大小
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) && file.size > MAX_IMAGE_SIZE) {
      // 删除已保存的文件
      fs.unlinkSync(file.path);
      return res.status(400).json({ code: 400, message: '图片文件大小不能超过 5MB' });
    }

    // 构建访问 URL
    const category = req.body.category || req.query.category || 'general';
    const relativePath = `/uploads/${category === 'general' ? 'general' : category + 's'}/${file.filename}`;
    // 修正路径 (avatar -> avatars, resume -> resumes, cover -> covers)
    const urlPath = `/uploads/${
      category === 'avatar' ? 'avatars' :
      category === 'resume' ? 'resumes' :
      category === 'cover' ? 'covers' : 'general'
    }/${file.filename}`;

    res.json({
      code: 200,
      message: '上传成功',
      data: {
        url: urlPath,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    });
  });
});

// ==================== 多文件上传（最多5个） ====================
router.post('/multiple', authMiddleware, (req, res) => {
  const multiUpload = upload.array('files', 5);

  multiUpload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ code: 400, message: '单个文件大小超过限制' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ code: 400, message: '最多同时上传5个文件' });
        }
        return res.status(400).json({ code: 400, message: `上传错误: ${err.message}` });
      }
      return res.status(400).json({ code: 400, message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ code: 400, message: '请选择要上传的文件' });
    }

    const category = req.body.category || req.query.category || 'general';
    const subDir = category === 'avatar' ? 'avatars' :
                   category === 'resume' ? 'resumes' :
                   category === 'cover' ? 'covers' : 'general';

    const files = req.files.map(file => ({
      url: `/uploads/${subDir}/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }));

    res.json({
      code: 200,
      message: `成功上传 ${files.length} 个文件`,
      data: { files },
    });
  });
});

export default router;
