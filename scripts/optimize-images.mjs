#!/usr/bin/env node
/**
 * Chuyển ảnh trong `public/images` sang AVIF (và thu nhỏ ảnh quá lớn) bằng `sharp` — thư viện Next vốn đã dùng
 * để tối ưu ảnh, nên không cần cài thêm gì.
 *
 *   node scripts/optimize-images.mjs                         # đọc cả public/images, ghi .avif cạnh bản gốc
 *   node scripts/optimize-images.mjs --delete-originals      # ghi .avif xong thì xoá bản gốc đã được thay
 *   node scripts/optimize-images.mjs --dry-run <đường dẫn…>  # chỉ in kết quả; đường dẫn là file hoặc thư mục
 *
 * Chỉ ghi `.avif` khi nhỏ hơn bản gốc ít nhất 5%; ảnh nhỏ sẵn (icon vài KB) giữ nguyên. SVG và ảnh đã là
 * `.avif` bị bỏ qua nên chạy lại bao nhiêu lần cũng được. Sau khi đổi tên file nhớ sửa chỗ tham chiếu trong `src/`.
 * Cách nạp ảnh và lý do chọn AVIF: `docs/RENDERING.md`, mục "Ảnh".
 */
import { createRequire } from 'node:module'
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const imagesDir = join(root, 'public', 'images')

/**
 * Mức nén theo thư mục (đường dẫn tính từ `public/images`, quy tắc đầu tiên khớp thì dùng).
 * - `maxEdge`: cạnh dài nhất sau khi thu nhỏ; không bao giờ phóng to.
 * - `chroma`: `4:4:4` giữ nét màu ở logo, bản vẽ; `4:2:0` đủ cho ảnh chụp, phối cảnh và nhỏ hơn rõ rệt.
 */
const RULES = [
  // Khung hiển thị 144×56 px nên 480 px đã dư cho màn 3x.
  { test: /^partners\//, maxEdge: 480, quality: 78, chroma: '4:4:4' },
  // Logo popup nguồn 1442 px nhưng chỉ hiện cao 96 px.
  { test: /^brand\//, maxEdge: 640, quality: 80, chroma: '4:4:4' },
  { test: /^journey\/.*\.png$/, maxEdge: 512, quality: 80, chroma: '4:4:4' },
  // Bản vẽ mặt bằng: nét mảnh và chữ nhỏ, cần giữ màu từng điểm ảnh.
  { test: /^library\/2d\//, maxEdge: 1800, quality: 68, chroma: '4:4:4' },
  { test: /^consultants\//, maxEdge: 800, quality: 62, chroma: '4:2:0' },
  { test: /.*/, maxEdge: 2200, quality: 60, chroma: '4:2:0' }
]

const SOURCE = /\.(png|jpe?g|webp)$/i

/** AVIF phải nhỏ hơn bản gốc ít nhất chừng này mới đáng đổi; icon vài KB thường chỉ hơn kém nhau vài chục byte. */
const MIN_SAVING = 0.05

function loadSharp() {
  try {
    // pnpm không đưa `sharp` ra thư mục gốc; đi qua đường dẫn thật của `next` để lấy đúng bản Next đang dùng.
    const nextDir = realpathSync(createRequire(import.meta.url).resolve('next/package.json'))
    return createRequire(nextDir)('sharp')
  } catch (error) {
    console.error('Không nạp được sharp (cần `pnpm install` trước):', error.message)
    process.exit(1)
  }
}

function collect(target) {
  const full = resolve(target)
  if (!existsSync(full)) {
    console.error(`Không thấy: ${target}`)
    process.exit(1)
  }
  if (statSync(full).isFile()) return SOURCE.test(full) ? [full] : []
  return readdirSync(full, { withFileTypes: true }).flatMap((entry) => collect(join(full, entry.name)))
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const deleteOriginals = args.includes('--delete-originals')
const targets = args.filter((arg) => !arg.startsWith('--'))
const files = [...new Set((targets.length > 0 ? targets : [imagesDir]).flatMap(collect))].sort()

// Hai file nguồn cùng tên khác đuôi (a.png, a.webp) sẽ đè lên nhau thành a.avif.
const outputs = new Map()
for (const file of files) {
  const output = file.replace(SOURCE, '.avif')
  if (outputs.has(output)) {
    console.error(
      `Trùng đích: ${relative(root, outputs.get(output))} và ${relative(root, file)} cùng thành ${relative(root, output)}`
    )
    process.exit(1)
  }
  outputs.set(output, file)
}

const sharp = loadSharp()
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`
let before = 0
let after = 0

for (const [output, file] of outputs) {
  const shown = relative(imagesDir, file).replaceAll('\\', '/')
  const rule = RULES.find((candidate) => candidate.test.test(shown))
  const original = statSync(file).size
  before += original

  const buffer = await sharp(file)
    .rotate() // áp hướng EXIF vào điểm ảnh: AVIF ghi ra không mang theo metadata
    .resize({ width: rule.maxEdge, height: rule.maxEdge, fit: 'inside', withoutEnlargement: true })
    .avif({ quality: rule.quality, effort: 6, chromaSubsampling: rule.chroma })
    .toBuffer()

  if (buffer.length > original * (1 - MIN_SAVING)) {
    after += original
    console.log(
      `giữ nguyên  ${kb(original).padStart(10)} → ${kb(buffer.length).padStart(10)}  ${shown} (AVIF không đáng kể)`
    )
    continue
  }

  after += buffer.length
  console.log(
    `${dryRun ? 'sẽ đổi    ' : 'đã đổi    '}  ${kb(original).padStart(10)} → ${kb(buffer.length).padStart(10)}  ${shown}`
  )
  if (dryRun) continue
  await writeFile(output, buffer)
  if (deleteOriginals) await rm(file)
}

console.log(`\nTổng ${files.length} ảnh: ${kb(before)} → ${kb(after)}`)
