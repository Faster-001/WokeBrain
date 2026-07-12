/**
 * 加解密工具 — API Key 安全存储
 *
 * 设计意图：
 * - 基于设备指纹派生密钥，防止 Storage 文件被直接拷贝到其他设备读取
 * - 加密后以 Base64 存储，避免明文泄露
 * - 微信小程序无 crypto 模块，使用 XOR + 设备指纹实现轻量混淆
 * - 非军事级加密，但能有效防御越狱设备上的 Storage 文件直接读取
 */

/** 固定盐值，增加密钥复杂度 */
const FIXED_SALT = 'WokeBrain_2026_SecureKey_v1'

/**
 * 基于设备信息生成设备绑定密钥
 * 使用 model + system + brand + 屏幕尺寸 + 固定盐 组合
 * 同一设备始终生成相同密钥，不同设备密钥不同
 */
function generateDeviceKey(): string {
  try {
    const info = wx.getSystemInfoSync()
    const fingerprint = [
      info.model || '',
      info.system || '',
      info.brand || '',
      String(info.screenWidth || 0),
      String(info.screenHeight || 0),
      FIXED_SALT
    ].join('|')
    // 简单哈希：将字符串转为数值序列作为密钥种子
    return hashString(fingerprint)
  } catch {
    // 降级：使用固定密钥
    return hashString(FIXED_SALT)
  }
}

/**
 * 简单字符串哈希，生成固定长度的密钥字符串
 */
function hashString(input: string): string {
  let hash = 0
  const chars: string[] = []
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
    // 每 4 个字符生成一个密钥字符
    if (i % 4 === 3) {
      chars.push(String.fromCharCode(33 + (Math.abs(hash) % 90)))
    }
  }
  // 确保密钥长度至少 16 字符
  while (chars.length < 16) {
    chars.push(String.fromCharCode(33 + (Math.abs(hash + chars.length * 7) % 90)))
  }
  return chars.join('')
}

/**
 * XOR 加密 + Base64 编码
 * @param plaintext 明文
 * @param key 密钥
 * @returns Base64 编码的密文
 */
function xorEncrypt(plaintext: string, key: string): string {
  const keyBytes = stringToBytes(key)
  const plainBytes = stringToBytes(plaintext)
  const cipherBytes: number[] = []

  for (let i = 0; i < plainBytes.length; i++) {
    cipherBytes.push(plainBytes[i] ^ keyBytes[i % keyBytes.length])
  }

  return bytesToBase64(cipherBytes)
}

/**
 * Base64 解码 + XOR 解密
 * @param cipherBase64 Base64 编码的密文
 * @param key 密钥
 * @returns 明文
 */
function xorDecrypt(cipherBase64: string, key: string): string {
  try {
    const cipherBytes = base64ToBytes(cipherBase64)
    const keyBytes = stringToBytes(key)
    const plainBytes: number[] = []

    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes.push(cipherBytes[i] ^ keyBytes[i % keyBytes.length])
    }

    return bytesToString(plainBytes)
  } catch {
    // 解密失败（可能是旧版明文数据），返回空字符串
    return ''
  }
}

// ========== 字节转换工具 ==========

function stringToBytes(str: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6))
      bytes.push(0x80 | (code & 0x3f))
    } else {
      bytes.push(0xe0 | (code >> 12))
      bytes.push(0x80 | ((code >> 6) & 0x3f))
      bytes.push(0x80 | (code & 0x3f))
    }
  }
  return bytes
}

function bytesToString(bytes: number[]): string {
  let str = ''
  let i = 0
  while (i < bytes.length) {
    const b = bytes[i]
    if (b < 0x80) {
      str += String.fromCharCode(b)
      i += 1
    } else if (b < 0xe0) {
      str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f))
      i += 2
    } else {
      str += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f))
      i += 3
    }
  }
  return str
}

// ========== Base64 编解码（不依赖 btoa/atob，兼容小程序环境） ==========

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function bytesToBase64(bytes: number[]): string {
  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i]
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0

    result += BASE64_CHARS[b1 >> 2]
    result += BASE64_CHARS[((b1 & 0x03) << 4) | (b2 >> 4)]
    result += i + 1 < bytes.length ? BASE64_CHARS[((b2 & 0x0f) << 2) | (b3 >> 6)] : '='
    result += i + 2 < bytes.length ? BASE64_CHARS[b3 & 0x3f] : '='
  }
  return result
}

function base64ToBytes(base64: string): number[] {
  const bytes: number[] = []
  // 移除填充符
  const cleaned = base64.replace(/=+$/, '')
  for (let i = 0; i < cleaned.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(cleaned[i])
    const c2 = BASE64_CHARS.indexOf(cleaned[i + 1] || 'A')
    const c3 = BASE64_CHARS.indexOf(cleaned[i + 2] || 'A')
    const c4 = BASE64_CHARS.indexOf(cleaned[i + 3] || 'A')

    bytes.push((c1 << 2) | (c2 >> 4))
    if (i + 2 < cleaned.length) {
      bytes.push(((c2 & 0x0f) << 4) | (c3 >> 2))
    }
    if (i + 3 < cleaned.length) {
      bytes.push(((c3 & 0x03) << 6) | c4)
    }
  }
  return bytes
}

// ========== 对外接口 ==========

/** 缓存的设备密钥，避免重复计算 */
let cachedDeviceKey: string | null = null

export const cryptoUtil = {
  /**
   * 加密 API Key
   * @param plaintext 明文 apiKey
   * @returns 加密后的 Base64 字符串，前缀 "WB1:" 标识加密版本
   */
  encrypt(plaintext: string): string {
    if (!plaintext) return ''
    if (!cachedDeviceKey) {
      cachedDeviceKey = generateDeviceKey()
    }
    const cipher = xorEncrypt(plaintext, cachedDeviceKey)
    // 前缀标识加密版本，便于未来升级加密算法
    return `WB1:${cipher}`
  },

  /**
   * 解密 API Key
   * @param ciphertext 加密后的字符串
   * @returns 明文 apiKey；若为旧版明文数据则直接返回；解密失败返回空字符串
   */
  decrypt(ciphertext: string): string {
    if (!ciphertext) return ''

    // 检查加密版本前缀
    if (!ciphertext.startsWith('WB1:')) {
      // 旧版明文数据，直接返回（向后兼容）
      return ciphertext
    }

    if (!cachedDeviceKey) {
      cachedDeviceKey = generateDeviceKey()
    }

    const cipher = ciphertext.slice(4) // 去掉 "WB1:" 前缀
    return xorDecrypt(cipher, cachedDeviceKey)
  },

  /**
   * 判断字符串是否为已加密格式
   */
  isEncrypted(text: string): boolean {
    return text.startsWith('WB1:')
  }
}