import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/utils'

/**
 * Các ô phòng vẽ được trên mặt bằng. Khai báo dạng union chứ không phải `string`
 * để `t(`rooms.${key}`)` vẫn kiểm tra được khóa dịch lúc biên dịch.
 */
type RoomKey =
  | 'living'
  | 'kitchen'
  | 'bed1'
  | 'bed2'
  | 'bed3'
  | 'wc'
  | 'stairs'
  | 'frontYard'
  | 'backYard'
  | 'balcony'
  | 'worship'
  | 'laundry'
  | 'garage'
  | 'void'
  | 'roof'

/** Tầng nào của mẫu đang được vẽ. */
export type PlanVariant = 'default' | 'ground' | 'upper' | 'attic' | 'roof'

/** Một ô phòng trong cột, `weight` là tỷ lệ chiều cao so với các ô cùng cột. */
interface Cell {
  key: RoomKey
  weight: number
}

/** Một cột của mặt bằng, `weight` là tỷ lệ bề ngang so với các cột khác. */
interface Column {
  weight: number
  cells: Cell[]
}

/**
 * Bố cục mặt bằng = danh sách cột, mỗi cột chia dọc thành các ô.
 *
 * Mô tả bằng tỷ lệ thay vì toạ độ tuyệt đối để một bố cục vẽ đúng với mọi tỷ lệ
 * lô đất: lô 4×18m và lô 6×15m dùng chung bố cục nhưng khung vẽ khác nhau.
 */
type Arrangement = readonly Column[]

/**
 * Mỗi tầng có vài phương án bố trí. Mẫu nào dùng phương án nào do `seed` quyết
 * định (băm từ id mẫu) — nếu chỉ có một phương án thì cả thư viện nhìn như một
 * bản vẽ nhân bản.
 */
const ARRANGEMENTS: Record<PlanVariant, readonly Arrangement[]> = {
  // Bản vuông của khung minh họa trang chủ và thẻ xem trước hồ sơ.
  default: [
    [
      {
        weight: 1.1,
        cells: [
          { key: 'living', weight: 1 },
          { key: 'bed1', weight: 1 }
        ]
      },
      {
        weight: 0.55,
        cells: [
          { key: 'kitchen', weight: 1 },
          { key: 'wc', weight: 0.5 },
          { key: 'stairs', weight: 0.5 }
        ]
      },
      {
        weight: 0.75,
        cells: [
          { key: 'kitchen', weight: 1 },
          { key: 'bed2', weight: 1 }
        ]
      }
    ]
  ],

  ground: [
    // Có sân trước để xe, thang giữa nhà.
    [
      { weight: 0.5, cells: [{ key: 'frontYard', weight: 1 }] },
      { weight: 1, cells: [{ key: 'living', weight: 1 }] },
      {
        weight: 0.45,
        cells: [
          { key: 'stairs', weight: 1 },
          { key: 'wc', weight: 0.85 }
        ]
      },
      { weight: 0.75, cells: [{ key: 'kitchen', weight: 1 }] },
      { weight: 0.42, cells: [{ key: 'backYard', weight: 1 }] }
    ],
    // Thang sát tường sau, khách rộng hết mặt tiền.
    [
      { weight: 0.3, cells: [{ key: 'frontYard', weight: 1 }] },
      { weight: 1.15, cells: [{ key: 'living', weight: 1 }] },
      { weight: 0.85, cells: [{ key: 'kitchen', weight: 1 }] },
      {
        weight: 0.42,
        cells: [
          { key: 'stairs', weight: 1 },
          { key: 'wc', weight: 0.8 }
        ]
      },
      { weight: 0.4, cells: [{ key: 'backYard', weight: 1 }] }
    ],
    // Có chỗ đậu ô tô trong nhà và giếng trời sau bếp.
    [
      { weight: 0.62, cells: [{ key: 'garage', weight: 1 }] },
      { weight: 0.95, cells: [{ key: 'living', weight: 1 }] },
      {
        weight: 0.42,
        cells: [
          { key: 'wc', weight: 0.8 },
          { key: 'stairs', weight: 1 }
        ]
      },
      { weight: 0.72, cells: [{ key: 'kitchen', weight: 1 }] },
      { weight: 0.35, cells: [{ key: 'void', weight: 1 }] }
    ]
  ],

  upper: [
    [
      { weight: 0.42, cells: [{ key: 'balcony', weight: 1 }] },
      { weight: 0.95, cells: [{ key: 'bed1', weight: 1 }] },
      {
        weight: 0.45,
        cells: [
          { key: 'stairs', weight: 1 },
          { key: 'wc', weight: 0.85 }
        ]
      },
      { weight: 1, cells: [{ key: 'bed2', weight: 1 }] }
    ],
    // Ba phòng ngủ: phòng nhỏ chia đôi cột sau.
    [
      { weight: 0.35, cells: [{ key: 'balcony', weight: 1 }] },
      { weight: 0.9, cells: [{ key: 'bed1', weight: 1 }] },
      {
        weight: 0.42,
        cells: [
          { key: 'wc', weight: 0.8 },
          { key: 'stairs', weight: 1 }
        ]
      },
      {
        weight: 0.9,
        cells: [
          { key: 'bed2', weight: 1 },
          { key: 'bed3', weight: 1 }
        ]
      }
    ],
    // Phòng ngủ chính có WC riêng, giếng trời giữa nhà.
    [
      { weight: 1, cells: [{ key: 'bed1', weight: 1 }] },
      { weight: 0.4, cells: [{ key: 'wc', weight: 1 }] },
      { weight: 0.32, cells: [{ key: 'void', weight: 1 }] },
      { weight: 0.42, cells: [{ key: 'stairs', weight: 1 }] },
      { weight: 0.85, cells: [{ key: 'bed2', weight: 1 }] }
    ]
  ],

  attic: [
    [
      { weight: 1, cells: [{ key: 'worship', weight: 1 }] },
      { weight: 0.45, cells: [{ key: 'stairs', weight: 1 }] },
      { weight: 1, cells: [{ key: 'laundry', weight: 1 }] }
    ],
    [
      { weight: 0.45, cells: [{ key: 'stairs', weight: 1 }] },
      { weight: 1, cells: [{ key: 'worship', weight: 1 }] },
      { weight: 0.35, cells: [{ key: 'wc', weight: 1 }] },
      { weight: 0.9, cells: [{ key: 'laundry', weight: 1 }] }
    ]
  ],

  roof: [[{ weight: 1, cells: [{ key: 'roof', weight: 1 }] }]]
}

/** Ô đã tính ra toạ độ tuyệt đối trong viewBox. */
interface PlacedRoom {
  key: RoomKey
  x: number
  y: number
  w: number
  h: number
}

/** Trải bố cục tỷ lệ thành các ô có toạ độ trong khung `walls`. */
function placeRooms(arrangement: Arrangement, walls: Box): PlacedRoom[] {
  const totalWeight = arrangement.reduce((sum, column) => sum + column.weight, 0)
  const rooms: PlacedRoom[] = []
  let x = walls.x

  for (const column of arrangement) {
    const w = (column.weight / totalWeight) * walls.w
    const columnWeight = column.cells.reduce((sum, cell) => sum + cell.weight, 0)
    let y = walls.y

    for (const cell of column.cells) {
      const h = (cell.weight / columnWeight) * walls.h
      rooms.push({ key: cell.key, x, y, w, h })
      y += h
    }
    x += w
  }

  return rooms
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Kích thước ghi trên đường kích thước, đơn vị mm — số liệu kỹ thuật của bản vẽ,
 * giống nhau ở mọi ngôn ngữ nên không đưa vào file dịch.
 */
const DIMENSION_MM = { width: '8 400', depth: '7 200' } as const

/** Chiều cao khung vẽ; bề ngang suy từ tỷ lệ lô đất. */
const CANVAS_HEIGHT = 120
const MARGIN = { top: 12, right: 22, bottom: 22, left: 12 } as const

interface PlanDrawingProps {
  className?: string
  /** Tầng cần vẽ. Mặc định giữ nguyên bản vuông đang dùng ở trang chủ / hồ sơ. */
  variant?: PlanVariant
  /**
   * Tỷ lệ bề ngang / chiều sâu lô đất. Lô 5×20m nằm ngang nên tỷ lệ là 4;
   * bỏ trống thì vẽ khung gần vuông.
   */
  ratio?: number
  /** Ghi đè số đo trên đường kích thước (đơn vị mm), ví dụ `{ width: '20 000' }`. */
  dimensions?: { width: string; depth: string }
  /** Đóng dấu bản quyền SAVICO ở góc bản vẽ (thư viện mẫu — Hình 7). */
  watermark?: boolean
  /** Chọn phương án bố trí. Cùng một mẫu luôn ra cùng một bản vẽ. */
  seed?: string
  /**
   * Nền lưới kiểu giấy can. Bật ở khung minh họa trang chủ và thẻ xem trước hồ
   * sơ; thư viện mẫu tắt đi vì bản vẽ mẫu in trên nền trắng (Hình 5, Hình 7).
   */
  paper?: boolean
  /**
   * Để khung tự cao theo tỷ lệ bản vẽ thay vì lấp đầy một khung tỷ lệ cố định.
   * Dùng ở khung lớn trang chi tiết, nơi bản vẽ phải chiếm trọn bề ngang; lưới
   * thẻ vẫn dùng khung cố định để các thẻ cao bằng nhau.
   */
  autoHeight?: boolean
}

/**
 * Bản vẽ mặt bằng 2D — vẽ thẳng bằng SVG thay vì dùng ảnh stock, nên nội dung
 * luôn đúng thứ nó minh họa và không phụ thuộc mạng.
 *
 * Dùng ở khung minh họa trang chủ (tab "Mặt bằng", mục II.2), thẻ xem trước bộ
 * hồ sơ (mục III.4a) và thư viện mẫu bản vẽ 2D trong Cẩm nang.
 */
export function PlanDrawing({
  className,
  variant = 'default',
  ratio,
  dimensions,
  watermark,
  seed,
  paper = true,
  autoHeight = false
}: PlanDrawingProps) {
  const t = useTranslations('design.planSample')

  // Vẫn kẹp để lô cực dài không thành sợi chỉ, nhưng phải đủ rộng cho lô
  // 5×20m (tỷ lệ 4) vẽ đúng dáng nhà phố như Hình 7.
  const safeRatio = Math.min(Math.max(ratio ?? 1.35, 1), 4.2)
  const walls: Box = {
    x: MARGIN.left,
    y: MARGIN.top,
    w: (CANVAS_HEIGHT - MARGIN.top - MARGIN.bottom) * safeRatio,
    h: CANVAS_HEIGHT - MARGIN.top - MARGIN.bottom
  }
  const canvasWidth = walls.w + MARGIN.left + MARGIN.right

  const options = ARRANGEMENTS[variant]
  const arrangement = options[hash(seed ?? '') % options.length] ?? options[0]
  const rooms = arrangement ? placeRooms(arrangement, walls) : []

  const size = dimensions ?? DIMENSION_MM
  const right = walls.x + walls.w
  const bottom = walls.y + walls.h

  return (
    <div className={cn('bg-card relative overflow-hidden', className)}>
      {/* Lưới nền kiểu giấy can. */}
      {paper ? (
        <div
          aria-hidden
          className='absolute inset-0 opacity-60'
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, var(--grid-line) 0 1px, transparent 1px 20px), repeating-linear-gradient(90deg, var(--grid-line) 0 1px, transparent 1px 20px)'
          }}
        />
      ) : null}

      <svg
        viewBox={`0 0 ${canvasWidth} ${CANVAS_HEIGHT}`}
        className={cn('relative', autoHeight ? 'block h-auto w-full' : 'size-full')}
        role='img'
        aria-label={t('label')}
      >
        {/* Sàn: một mảng nền ấm cho cả mặt bằng, để phòng không bị rỗng như ô kẻ. */}
        <rect x={walls.x} y={walls.y} width={walls.w} height={walls.h} className='fill-muted' />

        {rooms.map((room, index) => (
          <g key={`${room.key}-${index}`}>
            <RoomFill room={room} />
            <Furniture room={room} />
            {/* Vách ngăn trong nhà: nét mảnh hơn tường bao. */}
            <rect
              x={room.x}
              y={room.y}
              width={room.w}
              height={room.h}
              fill='none'
              className='stroke-foreground/45'
              strokeWidth='1.2'
              vectorEffect='non-scaling-stroke'
            />
            <RoomLabel room={room} text={t(`rooms.${room.key}`)} />
          </g>
        ))}

        {/* Tường bao: nét dày nhất trên bản vẽ, vẽ sau cùng để đè lên vách. */}
        <rect
          x={walls.x}
          y={walls.y}
          width={walls.w}
          height={walls.h}
          fill='none'
          className='stroke-foreground'
          strokeWidth='3'
          vectorEffect='non-scaling-stroke'
        />

        {/* Cửa chính + vệt mở cửa, đặt ở cạnh trái (mặt tiền của lô). */}
        {variant !== 'roof' ? (
          <>
            <line
              x1={walls.x}
              y1={bottom - walls.h * 0.42}
              x2={walls.x}
              y2={bottom - walls.h * 0.12}
              className='stroke-card'
              strokeWidth='3.4'
              vectorEffect='non-scaling-stroke'
            />
            <path
              d={`M ${walls.x} ${bottom - walls.h * 0.12} A ${walls.h * 0.3} ${walls.h * 0.3} 0 0 1 ${walls.x + walls.h * 0.3} ${bottom - walls.h * 0.42}`}
              fill='none'
              className='stroke-primary/70'
              strokeWidth='0.9'
              vectorEffect='non-scaling-stroke'
            />
          </>
        ) : null}

        {/* Đường kích thước ngang */}
        <g className='stroke-primary/70' strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          <line x1={walls.x} y1={bottom + 10} x2={right} y2={bottom + 10} />
          <line x1={walls.x} y1={bottom + 6} x2={walls.x} y2={bottom + 14} />
          <line x1={right} y1={bottom + 6} x2={right} y2={bottom + 14} />
        </g>
        <text
          x={walls.x + walls.w / 2}
          y={bottom + 8}
          textAnchor='middle'
          className='fill-primary'
          style={{ fontSize: 4.4 }}
        >
          {size.width}
        </text>

        {/* Đường kích thước dọc */}
        <g className='stroke-primary/70' strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          <line x1={right + 8} y1={walls.y} x2={right + 8} y2={bottom} />
          <line x1={right + 4} y1={walls.y} x2={right + 12} y2={walls.y} />
          <line x1={right + 4} y1={bottom} x2={right + 12} y2={bottom} />
        </g>
        <text
          x={right + 6}
          y={walls.y + walls.h / 2}
          textAnchor='middle'
          className='fill-primary'
          style={{ fontSize: 4.4 }}
          transform={`rotate(-90 ${right + 6} ${walls.y + walls.h / 2})`}
        >
          {size.depth}
        </text>

        {/* Dấu bản quyền — mẫu trong thư viện đều đóng dấu SAVICO (Hình 7). */}
        {watermark ? (
          <text
            x={right}
            y={bottom + 18}
            textAnchor='end'
            className='fill-primary/45'
            style={{ fontSize: 6, fontWeight: 700, letterSpacing: 1 }}
          >
            BUILDX
          </text>
        ) : null}
      </svg>
    </div>
  )
}

/** Bề rộng trung bình một ký tự so với cỡ chữ, dùng để ước lượng chiều dài nhãn. */
const GLYPH_RATIO = 0.56
const LABEL_MAX_SIZE = 3.6

/**
 * Tên phòng, đặt sát mép dưới ô.
 *
 * Cỡ chữ co lại cho vừa bề ngang ô: cột hẹp như "SÂN TRƯỚC" hay "CẦU THANG" mà
 * giữ nguyên cỡ thì chữ tràn sang phòng bên cạnh và đè lên tường bao.
 */
function RoomLabel({ room, text }: { room: PlacedRoom; text: string }) {
  const fontSize = Math.min(LABEL_MAX_SIZE, (room.w * 0.92) / (text.length * GLYPH_RATIO))

  // Ô quá nhỏ thì chữ nhỏ tới mức không đọc được, thà bỏ hẳn cho sạch bản vẽ.
  if (fontSize < 1.6) return null

  return (
    <text
      x={room.x + room.w / 2}
      y={room.y + room.h - fontSize * 0.7}
      textAnchor='middle'
      className='fill-foreground/70'
      style={{ fontSize, letterSpacing: 0.15, fontWeight: 600 }}
    >
      {text}
    </text>
  )
}

/** Sân, giếng trời và mái có nền riêng để phân biệt với phần có mái che. */
function RoomFill({ room }: { room: PlacedRoom }) {
  const outdoor = room.key === 'frontYard' || room.key === 'backYard' || room.key === 'balcony'
  if (outdoor) return <rect x={room.x} y={room.y} width={room.w} height={room.h} className='fill-primary/8' />
  if (room.key === 'void') return <rect x={room.x} y={room.y} width={room.w} height={room.h} className='fill-card' />
  if (room.key === 'wc') return <rect x={room.x} y={room.y} width={room.w} height={room.h} className='fill-card/70' />
  return null
}

/**
 * Đồ đạc trong phòng — vẽ tối giản nhưng đủ để đọc ra công năng ở cỡ thumbnail.
 * Không có nội thất thì mặt bằng chỉ là lưới ô chữ nhật, nhìn không ra bản vẽ.
 */
function Furniture({ room }: { room: PlacedRoom }) {
  const { x, y, w, h } = room
  const pad = Math.min(w, h) * 0.14
  const box = { x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2 }
  const solid = 'fill-foreground/12 stroke-foreground/45'
  const line = 'stroke-foreground/40'

  switch (room.key) {
    case 'living':
      return (
        <g strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          {/* Sofa chữ L + bàn trà + kệ TV áp tường đối diện. */}
          <rect x={box.x} y={box.y + box.h * 0.35} width={box.w * 0.5} height={box.h * 0.2} rx='1' className={solid} />
          <rect
            x={box.x}
            y={box.y + box.h * 0.35}
            width={box.w * 0.14}
            height={box.h * 0.45}
            rx='1'
            className={solid}
          />
          <rect
            x={box.x + box.w * 0.2}
            y={box.y + box.h * 0.62}
            width={box.w * 0.26}
            height={box.h * 0.16}
            rx='0.8'
            className={solid}
          />
          <rect
            x={box.x + box.w * 0.72}
            y={box.y + box.h * 0.3}
            width={box.w * 0.08}
            height={box.h * 0.4}
            className={solid}
          />
        </g>
      )

    case 'kitchen':
      return (
        <g strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          {/* Bếp áp tường trên + bàn ăn 4 ghế. */}
          <rect x={box.x} y={box.y} width={box.w} height={box.h * 0.16} className={solid} />
          <rect
            x={box.x + box.w * 0.22}
            y={box.y + box.h * 0.45}
            width={box.w * 0.56}
            height={box.h * 0.28}
            rx='0.8'
            className={solid}
          />
          {[0.28, 0.62].map((offset) => (
            <g key={offset}>
              <rect
                x={box.x + box.w * offset}
                y={box.y + box.h * 0.34}
                width={box.w * 0.12}
                height={box.h * 0.08}
                className={solid}
              />
              <rect
                x={box.x + box.w * offset}
                y={box.y + box.h * 0.78}
                width={box.w * 0.12}
                height={box.h * 0.08}
                className={solid}
              />
            </g>
          ))}
        </g>
      )

    case 'bed1':
    case 'bed2':
    case 'bed3':
      return (
        <g strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          {/* Giường + hai gối + tủ áo áp tường. */}
          <rect x={box.x + box.w * 0.14} y={box.y} width={box.w * 0.6} height={box.h * 0.62} rx='1' className={solid} />
          <rect
            x={box.x + box.w * 0.18}
            y={box.y + box.h * 0.04}
            width={box.w * 0.22}
            height={box.h * 0.12}
            rx='0.6'
            className={solid}
          />
          <rect
            x={box.x + box.w * 0.46}
            y={box.y + box.h * 0.04}
            width={box.w * 0.22}
            height={box.h * 0.12}
            rx='0.6'
            className={solid}
          />
          <rect x={box.x + box.w * 0.82} y={box.y} width={box.w * 0.18} height={box.h * 0.5} className={solid} />
        </g>
      )

    case 'wc':
      return (
        <g strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          {/* Bồn cầu + lavabo + vạch phân khu tắm. */}
          <ellipse
            cx={box.x + box.w * 0.3}
            cy={box.y + box.h * 0.3}
            rx={box.w * 0.16}
            ry={box.h * 0.12}
            className={solid}
          />
          <rect
            x={box.x + box.w * 0.6}
            y={box.y + box.h * 0.18}
            width={box.w * 0.3}
            height={box.h * 0.16}
            rx='0.8'
            className={solid}
          />
          <line
            x1={box.x}
            y1={box.y + box.h * 0.6}
            x2={box.x + box.w}
            y2={box.y + box.h * 0.6}
            className={line}
            strokeDasharray='2 1.5'
          />
        </g>
      )

    case 'stairs':
      return (
        <g strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          {/* Các bậc thang + mũi tên chiều lên. */}
          {Array.from({ length: 7 }).map((_, index) => (
            <line
              key={index}
              x1={box.x}
              y1={box.y + ((index + 1) * box.h) / 8}
              x2={box.x + box.w}
              y2={box.y + ((index + 1) * box.h) / 8}
              className={line}
            />
          ))}
          <line
            x1={box.x + box.w / 2}
            y1={box.y + box.h * 0.9}
            x2={box.x + box.w / 2}
            y2={box.y + box.h * 0.1}
            className='stroke-primary/70'
          />
          <path
            d={`M ${box.x + box.w / 2 - 1.4} ${box.y + box.h * 0.18} L ${box.x + box.w / 2} ${box.y + box.h * 0.08} L ${box.x + box.w / 2 + 1.4} ${box.y + box.h * 0.18}`}
            fill='none'
            className='stroke-primary/70'
          />
        </g>
      )

    case 'frontYard':
    case 'backYard':
    case 'balcony':
      return (
        <g strokeWidth='0.7' vectorEffect='non-scaling-stroke'>
          {/* Cây trồng dọc mép sân. */}
          {[0.22, 0.5, 0.78].map((offset) => (
            <circle
              key={offset}
              cx={box.x + box.w * 0.5}
              cy={box.y + box.h * offset}
              r={Math.min(box.w, box.h) * 0.16}
              className='fill-primary/25 stroke-primary/50'
            />
          ))}
        </g>
      )

    case 'garage':
      return (
        <g strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          {/* Ô tô nhìn từ trên xuống. */}
          <rect
            x={box.x + box.w * 0.2}
            y={box.y + box.h * 0.2}
            width={box.w * 0.6}
            height={box.h * 0.6}
            rx='2'
            className={solid}
          />
          <rect
            x={box.x + box.w * 0.3}
            y={box.y + box.h * 0.34}
            width={box.w * 0.4}
            height={box.h * 0.18}
            rx='1'
            className={solid}
          />
        </g>
      )

    case 'void':
      return (
        <g strokeWidth='0.7' vectorEffect='non-scaling-stroke'>
          {/* Giếng trời: gạch chéo báo ô thông tầng. */}
          <line x1={box.x} y1={box.y} x2={box.x + box.w} y2={box.y + box.h} className={line} />
          <line x1={box.x + box.w} y1={box.y} x2={box.x} y2={box.y + box.h} className={line} />
        </g>
      )

    case 'worship':
      return (
        <g strokeWidth='0.8' vectorEffect='non-scaling-stroke'>
          {/* Bàn thờ áp tường trong cùng. */}
          <rect x={box.x + box.w * 0.25} y={box.y} width={box.w * 0.5} height={box.h * 0.2} className={solid} />
        </g>
      )

    case 'laundry':
      return (
        <g strokeWidth='0.7' vectorEffect='non-scaling-stroke'>
          {/* Dây phơi + máy giặt. */}
          {[0.3, 0.5, 0.7].map((offset) => (
            <line
              key={offset}
              x1={box.x + box.w * 0.1}
              y1={box.y + box.h * offset}
              x2={box.x + box.w * 0.9}
              y2={box.y + box.h * offset}
              className={line}
              strokeDasharray='2 1.5'
            />
          ))}
          <rect x={box.x} y={box.y} width={box.w * 0.22} height={box.h * 0.2} className={solid} />
        </g>
      )

    case 'roof':
      return (
        <g strokeWidth='0.7' vectorEffect='non-scaling-stroke'>
          {/* Mái: gạch chéo đều + phễu thu nước ở góc. */}
          {Array.from({ length: 14 }).map((_, index) => {
            const step = (box.w + box.h) / 14
            const offset = index * step
            return (
              <line
                key={index}
                x1={box.x + offset}
                y1={box.y}
                x2={box.x + offset - box.h}
                y2={box.y + box.h}
                className='stroke-foreground/15'
              />
            )
          })}
          <circle
            cx={box.x + box.w * 0.9}
            cy={box.y + box.h * 0.8}
            r={Math.min(box.w, box.h) * 0.07}
            className={solid}
          />
        </g>
      )

    default:
      return null
  }
}

/** Băm chuỗi thành số nguyên để chọn phương án bố trí một cách ổn định. */
function hash(value: string): number {
  let result = 0
  for (let index = 0; index < value.length; index++) {
    result = (result * 31 + value.charCodeAt(index)) % 100_000
  }
  return result
}
