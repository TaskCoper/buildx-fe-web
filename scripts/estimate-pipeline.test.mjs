import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import ts from 'typescript'

// Luồng dự toán bốn chặng (TDD-PROJ-006/007/008): kiểm phần logic thuần bằng test runner có sẵn của Node, cùng cách
// với route-access.test.mjs. Ba tệp dưới đây không import giá trị nên chuyển sang JS rồi nạp thẳng được.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
async function load(path) {
  const source = await readFile(resolve(root, path), 'utf8')
  let js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText
  if (path.endsWith('pipeline-api.schema.ts')) {
    const logicSource = await readFile(resolve(root, 'src/features/design/services/pipeline.logic.ts'), 'utf8')
    const logicJs = ts.transpileModule(logicSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
    js = js
      .replace("'zod'", JSON.stringify(import.meta.resolve('zod')))
      .replace(
        "'../services/pipeline.logic'",
        JSON.stringify(`data:text/javascript;base64,${Buffer.from(logicJs).toString('base64')}`)
      )
  }
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
}

const pipeline = await load('src/features/design/services/pipeline.logic.ts')
const input = await load('src/features/design/services/estimate-input.logic.ts')
const admin = await load('src/features/admin/api/bmt/estimate-pipeline.logic.ts')
const estimate = await load('src/features/design/services/estimate-stage.logic.ts')

/* ---------------------------------------------------------------------------
 * Đầu vào mới (BR-PROJ-001, 002; TDD-PROJ-007 mục A)
 * ------------------------------------------------------------------------ */

test('kích thước lô: hai ô đi cùng nhau, số dương tối đa 2 chữ số lẻ', () => {
  assert.equal(input.lotSizeProblem('', ''), null)
  assert.equal(input.lotSizeProblem('5', '20'), null)
  assert.equal(input.lotSizeProblem('5.25', '20.5'), null)
  assert.equal(input.lotSizeProblem('5', ''), 'pair')
  assert.equal(input.lotSizeProblem('', '20'), 'pair')
  assert.equal(input.lotSizeProblem('0', '20'), 'format')
  assert.equal(input.lotSizeProblem('5.123', '20'), 'format')
  assert.equal(input.lotSizeProblem('-5', '20'), 'format')
  assert.equal(input.lotSizeProblem('12345', '20'), 'format')
})

test('số phòng ngủ 1–10, số nguyên', () => {
  assert.equal(input.bedroomsProblem(null), null)
  assert.equal(input.bedroomsProblem(1), null)
  assert.equal(input.bedroomsProblem(10), null)
  assert.equal(input.bedroomsProblem(0), 'range')
  assert.equal(input.bedroomsProblem(11), 'range')
  assert.equal(input.bedroomsProblem(2.5), 'range')
})

test('mô tả tối đa 4.000 ký tự đếm theo ký tự Unicode, không theo UTF-16', () => {
  assert.equal(input.PIPELINE_DESCRIPTION_MAX_LENGTH, 4000)
  assert.equal(input.descriptionLength('🏠'.repeat(4000)), 4000)
  assert.equal('🏠'.repeat(4000).length, 8000)
})

test('chỉ gửi ô mới khi BE đã trả khoá desiredBedrooms', () => {
  assert.equal(input.supportsPipelineInput({ desiredBedrooms: null }), true)
  assert.equal(input.supportsPipelineInput({ areaM2: '70' }), false)
  const draft = input.draftFromInput({ desiredBedrooms: 3, lotFrontageM: '5', lotDepthM: '20' })
  assert.equal(draft.entranceSide, null, 'chưa bấm cạnh cửa vào thì để trống, BE dùng mặc định Trái (BR-PROJ-002)')
  assert.equal(draft.hasGarage, false, 'gara mặc định Không')
  assert.equal('desiredBedrooms' in input.inputBody(draft, false, false), false)
  const body = input.inputBody(draft, false, true)
  assert.deepEqual(
    [body.lotFrontageM, body.lotDepthM, body.entranceSide, body.desiredBedrooms, body.hasGarage],
    ['5', '20', null, 3, false]
  )
  const chosen = input.inputBody({ ...draft, entranceSide: 'Bottom' }, false, true)
  assert.equal(chosen.entranceSide, 'Bottom', 'khách bấm cạnh nào thì gửi đúng cạnh đó')
})

test('changedFields so kích thước lô theo giá trị số và chỉ thêm ô mới khi bật', () => {
  const saved = input.normalizeSaved({
    finishPackage: 'Standard',
    lotFrontageM: '5.0',
    lotDepthM: '20',
    desiredBedrooms: 3,
    hasGarage: false
  })
  const draft = input.draftFromInput({
    finishPackage: 'Standard',
    lotFrontageM: '5',
    lotDepthM: '20.00',
    desiredBedrooms: 3
  })
  assert.deepEqual(input.changedFields(saved, draft, false, true), [])
  const more = { ...draft, desiredBedrooms: 4, hasGarage: true }
  assert.deepEqual(input.changedFields(saved, more, false, true), ['desiredBedrooms', 'hasGarage'])
  assert.deepEqual(input.changedFields(saved, more, false, false), [], 'tắt luồng mới thì không so ô mới')
})

test('trường thiếu trước chặng 2D: ảnh bắt buộc và phải Đạt, không đòi diện tích hay mô tả', () => {
  const catalog = input.normalizeCatalog({
    buildingTypes: [
      {
        buildingTypeId: 'house',
        name: 'Nhà phố',
        baseCode: 'nha-pho',
        floorsEnabled: true,
        tumEnabled: true,
        architectureEnabled: false,
        interiorEnabled: false,
        floorCounts: [1, 2]
      },
      {
        buildingTypeId: 'flat',
        name: 'Căn hộ',
        baseCode: 'can-ho',
        floorsEnabled: true,
        tumEnabled: true,
        architectureEnabled: false,
        interiorEnabled: false,
        floorCounts: [1]
      }
    ]
  })
  const base = {
    ...input.draftFromInput({}),
    buildingTypeId: 'house',
    provinceCode: '79',
    wardCode: '1',
    addressDetail: '12 Nguyễn Huệ',
    latitude: 10.7,
    longitude: 106.7,
    floorCount: 2,
    hasTum: false
  }
  assert.deepEqual(
    input.pipelineMissingFields(base, catalog, { requireCoordinates: true, lotVerificationPassed: false }),
    ['inputImageUrl', 'desiredBedrooms']
  )
  const withImage = { ...base, inputImageUrl: 'https://cdn.example.test/lot.jpg', desiredBedrooms: 3 }
  assert.deepEqual(input.pipelineMissingFields(withImage, catalog, { lotVerificationPassed: false }), [
    'lotVerification'
  ])
  assert.deepEqual(input.pipelineMissingFields(withImage, catalog, { lotVerificationPassed: true }), [])
  assert.deepEqual(
    input.pipelineMissingFields({ ...withImage, lotFrontageM: '5' }, catalog, { lotVerificationPassed: true }),
    ['lotSize']
  )
  // Căn hộ (mã gốc can-ho) luôn một sàn: không đòi số tầng, tum.
  const flat = { ...withImage, buildingTypeId: 'flat', floorCount: null, hasTum: null }
  assert.deepEqual(input.pipelineMissingFields(flat, catalog, { lotVerificationPassed: true }), [])
})

/* ---------------------------------------------------------------------------
 * Ảnh lô và soi ảnh (BR-PROJ-015, TDD-PROJ-007 mục C–D)
 * ------------------------------------------------------------------------ */

test('ảnh lô: định dạng, 10 MiB, tối thiểu 640×480, tỷ lệ cạnh ≤ 3', () => {
  const ok = { type: 'image/png', size: 10 * 1024 * 1024, width: 2000, height: 1500 }
  assert.equal(pipeline.lotImageProblem(ok), null)
  assert.equal(pipeline.lotImageProblem({ ...ok, size: 10 * 1024 * 1024 + 1 }), 'size')
  assert.equal(pipeline.lotImageProblem({ ...ok, type: 'image/heic' }), 'type')
  assert.equal(pipeline.lotImageProblem({ ...ok, width: 600, height: 400 }), 'tooSmall')
  assert.equal(pipeline.lotImageProblem({ ...ok, width: 480, height: 640 }), null, 'ảnh dọc 480×640 vẫn đủ')
  assert.equal(pipeline.lotImageProblem({ ...ok, width: 3300, height: 1000 }), 'aspect')
  assert.equal(pipeline.lotImageProblem({ ...ok, width: 3000, height: 1000 }), null, 'đúng 3 lần vẫn nhận')
  assert.equal(
    pipeline.lotImageProblem({ type: 'image/webp', size: 1000 }),
    null,
    'chưa đọc được kích thước thì để BE quyết'
  )
})

test('soi ảnh: hỏi lại 3 giây khi đang soi, kết quả Đạt mới mở 2D', () => {
  assert.equal(pipeline.lotVerificationPollInterval({ state: 'Pending' }), 3000)
  assert.equal(pipeline.lotVerificationPollInterval({ state: 'Processing' }), 3000)
  assert.equal(pipeline.lotVerificationPollInterval({ state: 'Completed' }), false)
  assert.equal(pipeline.lotVerificationPollInterval(null), false)
  assert.equal(pipeline.lotVerificationPassed({ requestId: 'r', state: 'Completed', verdict: 'Pass' }), true)
  assert.equal(pipeline.lotVerificationPassed({ requestId: 'r', state: 'Completed', verdict: 'Fail' }), false)
  assert.equal(pipeline.lotVerificationPassed({ requestId: 'r', state: 'Failed' }), false)
  assert.equal(
    pipeline.lotVerificationDisplay({ requestId: 'r', state: 'Failed', failureCode: 'LotVerificationBusy' }),
    'failed'
  )
})

test('mã lỗi soi ảnh ánh xạ đúng nhóm câu báo', () => {
  assert.equal(pipeline.lotVerificationFailureKind('LotVerificationQuotaExceeded'), 'quota')
  assert.equal(pipeline.lotVerificationFailureKind('LotVerificationUnavailable'), 'unavailable')
  assert.equal(pipeline.lotVerificationFailureKind('LotImageInvalid'), 'invalidImage')
  assert.equal(pipeline.lotVerificationFailureKind('LotVerificationBusy'), 'busy')
  assert.equal(pipeline.lotVerificationFailureKind('Other'), 'other')
  assert.equal(pipeline.lotVerificationRequestErrorKind({ status: 409, code: 'EstimateInputLocked' }), 'locked')
  assert.equal(
    pipeline.lotVerificationRequestErrorKind({ status: 503, messageCode: 'AiServiceUnavailable' }),
    'aiPaused'
  )
  assert.equal(pipeline.lotVerificationRequestErrorKind({ status: 503, code: 'LotVerificationBusy' }), 'busy')
})

/* ---------------------------------------------------------------------------
 * Chặng và lần chạy (TDD-PROJ-006)
 * ------------------------------------------------------------------------ */

test('trạng thái chặng: đọc TimedOut là lỗi, giá trị lạ là Chưa mở; hỏi lại 5 giây khi đang chạy', () => {
  assert.equal(pipeline.normalizeStageStatus('TimedOut'), 'Failed')
  assert.equal(pipeline.normalizeStageStatus('running'), 'Running')
  assert.equal(pipeline.normalizeStageStatus('Whatever'), 'Locked')
  assert.equal(pipeline.stagePollInterval([{ status: 'Queued' }]), 5000)
  assert.equal(pipeline.stagePollInterval([{ status: 'Succeeded' }, { status: 'Locked' }]), false)
})

test('tiến độ x/y đọc cả dạng đối tượng và chuỗi, không đoán khi thiếu tổng', () => {
  assert.deepEqual(pipeline.parseProgress({ done: 3, total: 5 }), { done: 3, total: 5 })
  assert.deepEqual(pipeline.parseProgress('2/4'), { done: 2, total: 4 })
  assert.equal(pipeline.parseProgress(null), null)
  assert.equal(pipeline.progressPercent({ done: 3, total: 5 }), 60)
  assert.equal(pipeline.progressPercent({ done: 3, total: null }), null)
})

test('thanh tiến trình năm bước theo trạng thái chặng', () => {
  const states = pipeline.pipelineStepStates(
    [
      { stage: 'Plan2d', status: 'Succeeded' },
      { stage: 'Estimate', status: 'Failed' },
      { stage: 'Render3d', status: 'Locked' },
      { stage: 'Dossier', status: 'Locked' }
    ],
    2
  )
  assert.deepEqual(states, { 1: 'done', 2: 'done', 3: 'failed', 4: 'locked', 5: 'locked' })
  const fresh = pipeline.pipelineStepStates(undefined, 1)
  assert.deepEqual(fresh, { 1: 'current', 2: 'ready', 3: 'locked', 4: 'locked', 5: 'locked' })
})

test('lỗi khi bấm chạy chặng ánh xạ đúng nhóm', () => {
  const kind = (code, status = 409) => pipeline.stageRunErrorKind({ status, code })
  assert.equal(kind('StageRetryLimitReached'), 'retryLimit')
  assert.equal(kind('StageRunInProgress'), 'inProgress')
  assert.equal(kind('LegacyResultExists'), 'legacyResult')
  assert.equal(kind('InvalidStageInput', 422), 'invalidInput')
  assert.equal(kind('PipelineUnavailable', 503), 'maintenance')
  assert.equal(kind('PipelineBusy', 503), 'busy')
  assert.equal(kind('AiServiceUnavailable', 503), 'aiPaused')
  assert.equal(kind('QuotaUnavailable'), 'quota')
  assert.equal(kind('EntitlementMissing', 403), 'subscription')
  assert.equal(pipeline.stageRunErrorKind({ status: 0 }), 'network')
})

test('khóa chống gửi lặp: giữ khi lỗi mạng/máy chủ, bỏ khi bị từ chối rõ ràng', () => {
  assert.equal(pipeline.keepRunKeyAfter({ status: 0 }), true)
  assert.equal(pipeline.keepRunKeyAfter({ status: 502 }), true)
  assert.equal(pipeline.keepRunKeyAfter({ status: 503, code: 'PipelineBusy' }), false)
  assert.equal(pipeline.keepRunKeyAfter({ status: 409, code: 'StageRunInProgress' }), false)
  assert.equal(pipeline.keepRunKeyAfter({ status: 422, code: 'InvalidStageInput' }), false)
})

test('trường thiếu từ 422 InvalidStageInput bỏ tiền tố input.', () => {
  assert.deepEqual(pipeline.invalidStageFields({ 'input.lotSize': ['x'], catalogMapping: ['y'] }), [
    'lotSize',
    'catalogMapping'
  ])
  assert.deepEqual(pipeline.invalidStageFields(undefined), [])
})

/* ---------------------------------------------------------------------------
 * Danh sách "Dự toán của tôi" (BR-PROJ-008 khoản 2)
 * ------------------------------------------------------------------------ */

test('năm trạng thái danh sách, Succeeded là bí danh của Completed', () => {
  assert.equal(pipeline.normalizeListState('Succeeded'), 'Completed')
  assert.equal(pipeline.projectStatusOfListState('Draft'), 'input')
  assert.equal(pipeline.projectStatusOfListState('Processing'), 'designing')
  assert.equal(pipeline.projectStatusOfListState('Failed'), 'failed')
  assert.equal(pipeline.projectStatusOfListState('InProgress'), 'inProgress')
  assert.equal(pipeline.projectStatusOfListState('Completed'), 'completed')
})

test('mini-stepper năm nấc theo chặng đã xong gần nhất', () => {
  assert.deepEqual(pipeline.pipelineMiniSteps('Draft', null), {
    1: 'current',
    2: 'pending',
    3: 'pending',
    4: 'pending',
    5: 'pending'
  })
  assert.deepEqual(pipeline.pipelineMiniSteps('Processing', null), {
    1: 'done',
    2: 'current',
    3: 'pending',
    4: 'pending',
    5: 'pending'
  })
  assert.deepEqual(pipeline.pipelineMiniSteps('InProgress', 'Plan2d'), {
    1: 'done',
    2: 'done',
    3: 'current',
    4: 'pending',
    5: 'pending'
  })
  assert.deepEqual(pipeline.pipelineMiniSteps('Failed', 'Plan2d'), {
    1: 'done',
    2: 'done',
    3: 'failed',
    4: 'pending',
    5: 'pending'
  })
  assert.deepEqual(pipeline.pipelineMiniSteps('Completed', 'Dossier'), {
    1: 'done',
    2: 'done',
    3: 'done',
    4: 'done',
    5: 'done'
  })
})

/* ---------------------------------------------------------------------------
 * Màn quản trị (STORY-PROJ-011, 012; TDD-PROJ-008)
 * ------------------------------------------------------------------------ */

test('cấu hình AI: đọc cả dạng có lớp config, giữ trường lạ khi gửi lại', () => {
  const view = admin.normalizePipelineConfig({
    version: 4,
    supportedModels: [{ model: 'gpt-6-astra', provider: 'OpenAI', capabilities: { reasoning: true } }],
    config: {
      stages: [{ stage: 'Plan2d', timeoutMinutes: 20, retryLimit: 3 }],
      maxQueuedRuns: 40,
      breaker: { failureThreshold: 10, openMinutes: 5 },
      runCostAlertUsd: '3.00',
      openAiRequestTimeoutSeconds: 240
    }
  })
  assert.equal(view.version, 4)
  assert.deepEqual(view.config.stages[0], { stage: 'Plan2d', timeoutMinutes: 20, retryLimit: 3 })
  assert.equal(view.config.stages.length, 4, 'đủ bốn chặng dù BE thiếu dòng')
  assert.equal(view.config.runCostAlertUsd, 3)
  const body = admin.pipelineConfigBody(view, { ...view.config, maxQueuedRuns: 30 }, '  Giảm hàng chờ ')
  assert.equal(body.expectedVersion, 4)
  assert.equal(body.note, 'Giảm hàng chờ')
  assert.equal(body.maxQueuedRuns, 30)
  assert.equal(body.openAiRequestTimeoutSeconds, 240, 'trường màn này chưa biết vẫn được gửi lại nguyên')
})

test('tham số model phải là đối tượng JSON; đường dẫn lỗi trường đổi sang dạng form', () => {
  assert.deepEqual(admin.parseParameters('{"reasoning":"low"}'), { reasoning: 'low' })
  assert.deepEqual(admin.parseParameters(''), {})
  assert.equal(admin.parseParameters('[1]'), null)
  assert.equal(admin.parseParameters('{oops'), null)
  assert.deepEqual(admin.configFieldPath('tasks[0].model'), ['tasks', 0, 'model'])
})

test('vùng giá: mỗi tỉnh cần một miền (Tây Nguyên thuộc miền Trung); chỉ gửi dòng đã đổi kèm rowVersion', () => {
  assert.equal(admin.regionRowProblem({ region: null }), 'missingRegion')
  assert.equal(admin.regionRowProblem({ region: 'Central' }), null)
  const original = [
    { provinceCode: '79', provinceName: 'TP.HCM', region: 'South', rowVersion: '11' },
    { provinceCode: '68', provinceName: 'Lâm Đồng', region: 'Central', rowVersion: '12' }
  ]
  const edited = [original[0], { ...original[1], region: 'South' }]
  assert.deepEqual(admin.changedRegionRows(original, edited), [
    { provinceCode: '68', region: 'South', rowVersion: '12' }
  ])
  assert.equal(
    admin.normalizePricingRegions({ provinces: [{ provinceCode: '68', region: 'Central', highland: true }] }).rows[0]
      .highland,
    undefined
  )
})

test('đặt lại bộ đếm: chỉ khi có lần lỗi được tính, chặng chưa thành công và không đang chạy', () => {
  const runs = [
    { stage: 'Estimate', state: 'Failed', countsTowardLimit: true },
    { stage: 'Plan2d', state: 'Succeeded', countsTowardLimit: false },
    { stage: 'Render3d', state: 'Failed', countsTowardLimit: false }
  ]
  assert.equal(admin.canResetStage(runs, 'Estimate'), true)
  assert.equal(admin.canResetStage(runs, 'Plan2d'), false)
  assert.equal(admin.canResetStage(runs, 'Render3d'), false, 'lỗi hệ thống không tính nên không có gì để đặt lại')
  assert.equal(
    admin.canResetStage([...runs, { stage: 'Estimate', state: 'Running', countsTowardLimit: false }], 'Estimate'),
    false
  )
})

test('chi phí một lần chạy cộng các lời gọi AI có giá', () => {
  assert.equal(
    admin.runCostUsd({ aiCalls: [{ estimatedCostUsd: 0.11 }, { estimatedCostUsd: null }, { estimatedCostUsd: 0.2 }] }),
    0.31
  )
  assert.equal(admin.runCostUsd({ aiCalls: [] }), null)
})

/* ---------------------------------------------------------------------------
 * Chặng Dự toán: ba tab, tổng, định dạng số, lỗi và chạy lại (STORY-PROJ-008, TDD-PROJ-009 mục P)
 * ------------------------------------------------------------------------ */

const sampleEstimate = {
  totals: { structure: 1300000000, finishing: 581900000, interior: 486000000, grandTotal: 2367900000 },
  parts: [
    {
      part: 'Interior',
      total: 486000000,
      groups: [{ name: 'TẦNG 1', items: [{ name: 'Tủ bếp', size: '3200×600×850 mm', amount: 16640000 }] }]
    },
    {
      part: 'Structure',
      total: 1300000000,
      groups: [{ name: 'PHẦN MÓNG & NỀN', items: [{ name: 'Bê tông móng M250', amount: 34780000 }] }]
    },
    { part: 'Finishing', total: 581900000, groups: [] }
  ]
}

test('dự toán: luôn đủ ba tab theo thứ tự thô → hoàn thiện → nội thất như app demo', () => {
  const tabs = estimate.estimateTabs(sampleEstimate)
  assert.deepEqual(
    tabs.map((tab) => tab.part),
    ['structure', 'finishing', 'interior']
  )
  assert.equal(tabs[0].groups[0].name, 'PHẦN MÓNG & NỀN')
  assert.equal(tabs[1].empty, true, 'phần không có nhóm nào hiện dòng "không có hạng mục"')
  assert.equal(tabs[2].empty, false)
  assert.deepEqual(
    tabs.map((tab) => tab.total),
    [1300000000, 581900000, 486000000]
  )
  assert.equal(estimate.estimateGrandTotal(sampleEstimate), 2367900000)
})

test('dự toán: căn hộ không có phần thô thì tab Phần thô rỗng, tổng 0; tổng dự toán cộng ba phần khi thiếu', () => {
  const apartment = {
    totals: null,
    parts: [
      { part: 'Finishing', total: 300000000, groups: [{ name: 'SÀN', items: [{ name: 'Lát sàn', amount: 1 }] }] },
      { part: 'Interior', groups: [{ name: 'PHÒNG KHÁCH', items: [{ name: 'Sofa', amount: 25000000 }] }] }
    ]
  }
  const [structure, finishing, interior] = estimate.estimateTabs(apartment)
  assert.equal(structure.empty, true)
  assert.equal(structure.total, 0)
  assert.equal(finishing.total, 300000000, 'thiếu totals thì lấy tổng của phần')
  assert.equal(interior.total, 25000000, 'thiếu cả tổng phần thì cộng thành tiền các dòng')
  assert.equal(estimate.estimateGrandTotal(apartment), 325000000)
})

test('dự toán: đọc tên phần theo hợp đồng estimate-v1 và theo khóa của app demo', () => {
  assert.equal(estimate.estimatePartOf('Structure'), 'structure')
  assert.equal(estimate.estimatePartOf('finishing'), 'finishing')
  assert.equal(estimate.estimatePartOf('noi_that'), 'interior')
  assert.equal(estimate.estimatePartOf('phan_tho'), 'structure')
  assert.equal(estimate.estimatePartOf('Other'), null)
  assert.equal(estimate.estimatePartOf(null), null)
})

test('dự toán: số tiền và khối lượng định dạng như money()/number() của app demo', () => {
  assert.equal(estimate.formatEstimateAmount(34780000, 'vi'), '34.780.000')
  assert.equal(estimate.formatEstimateAmount(8770000.5, 'vi'), '8.770.001', 'làm tròn tới đồng như Math.round')
  assert.equal(estimate.formatEstimateAmount(34780000, 'en'), '34,780,000')
  assert.equal(estimate.formatEstimateAmount(null, 'vi'), '0', 'thiếu số thì in 0 như money(n || 0) của app demo')
  assert.equal(estimate.formatEstimateAmount(undefined, 'vi'), '0')
  assert.equal(estimate.formatEstimateAmount(Number.NaN, 'vi'), '0')
  assert.equal(estimate.formatEstimateQuantity(18.5, 'vi'), '18,5')
  assert.equal(estimate.formatEstimateQuantity(1234.567, 'vi'), '1.234,57', 'tối đa 2 chữ số lẻ')
  assert.equal(estimate.formatEstimateQuantity(3, 'vi'), '3')
  assert.equal(estimate.formatEstimateQuantity(3.2, 'en'), '3.2')
  assert.equal(estimate.formatEstimateQuantity(undefined, 'vi'), '0', 'thiếu khối lượng in 0 như number(n || 0)')
  assert.equal(estimate.formatEstimateQuantity(null, 'vi'), '0')
})

test('dự toán: thời gian thi công chỉ giữ dòng có nội dung, theo thứ tự thô → hoàn thiện → nội thất → tổng', () => {
  assert.deepEqual(
    estimate.estimateScheduleRows({ total: '~5,5 tháng', structure: '~95 ngày', finishing: ' ', interior: null }),
    [
      { key: 'structure', value: '~95 ngày' },
      { key: 'total', value: '~5,5 tháng' }
    ]
  )
  assert.deepEqual(estimate.estimateScheduleRows(null), [])
})

test('dự toán: mã lỗi lần chạy thành câu chung, không lộ nhà cung cấp (AC-009)', () => {
  assert.equal(estimate.estimateFailureKind('AiOutputIncomplete'), 'incomplete')
  assert.equal(estimate.estimateFailureKind('AiContentBlocked'), 'blocked')
  assert.equal(estimate.estimateFailureKind('StageTimedOut'), 'timedOut')
  for (const code of ['AiProviderUnavailable', 'AiOutOfCredit', 'AiOutputTruncated'])
    assert.equal(estimate.estimateFailureKind(code), 'serviceDown', code)
  for (const code of ['ArtifactStoreFailed', 'InternalError', 'PipelineVersionRetired', null, 'Lạ'])
    assert.equal(estimate.estimateFailureKind(code), 'generic', String(code))
})

test('dự toán: còn lượt thì chạy lại, hết lượt thì báo liên hệ hỗ trợ (BR-PROJ-011 khoản 2)', () => {
  assert.deepEqual(estimate.stageRetryState({ retriesLeft: 2 }), { kind: 'left', count: 2 })
  assert.deepEqual(estimate.stageRetryState({ retriesLeft: 0 }), { kind: 'limit' })
  assert.deepEqual(estimate.stageRetryState({ retriesLeft: 1, blockedReason: 'StageRetryLimitReached' }), {
    kind: 'limit'
  })
  assert.deepEqual(estimate.stageRetryState({ retriesLeft: null }), { kind: 'unknown' })
  assert.deepEqual(estimate.stageRetryState({}), { kind: 'unknown' })
})

/* ---------------------------------------------------------------------------
 * Câu báo lỗi có đủ ở hai ngôn ngữ
 * ------------------------------------------------------------------------ */

test('mỗi nhóm lỗi và mỗi trạng thái nấc đều có câu ở cả vi và en', async () => {
  const messages = {
    vi: JSON.parse(await readFile(resolve(root, 'messages/vi.json'), 'utf8')),
    en: JSON.parse(await readFile(resolve(root, 'messages/en.json'), 'utf8'))
  }
  const runKinds = [
    'inProgress',
    'alreadySucceeded',
    'prerequisite',
    'retryLimit',
    'versionConflict',
    'idempotencyConflict',
    'legacyResult',
    'invalidInput',
    'maintenance',
    'busy',
    'aiPaused',
    'stageUnavailable',
    'quota',
    'subscription',
    'notFound',
    'network',
    'other'
  ]
  const stepStates = ['done', 'current', 'running', 'failed', 'ready', 'locked']
  for (const locale of ['vi', 'en']) {
    const design = messages[locale].design
    for (const kind of runKinds) assert.ok(design.pipeline.runError[kind], `${locale}: runError.${kind}`)
    for (const state of stepStates) assert.ok(design.steps.status[state], `${locale}: steps.status.${state}`)
    for (const kind of ['quota', 'unavailable', 'invalidImage', 'busy', 'other'])
      assert.ok(design.pipeline.verify.failure[kind], `${locale}: verify.failure.${kind}`)
  }
})

test('chặng Dự toán: mọi nhóm lỗi, tab, cột và dòng thời gian thi công đều có câu ở cả vi và en', async () => {
  const messages = {
    vi: JSON.parse(await readFile(resolve(root, 'messages/vi.json'), 'utf8')),
    en: JSON.parse(await readFile(resolve(root, 'messages/en.json'), 'utf8'))
  }
  const failureKinds = ['incomplete', 'blocked', 'timedOut', 'serviceDown', 'generic']
  for (const locale of ['vi', 'en']) {
    const copy = messages[locale].design.pipeline.estimate
    for (const kind of failureKinds) assert.ok(copy.failure[kind], `${locale}: estimate.failure.${kind}`)
    for (const part of estimate.ESTIMATE_PARTS) {
      assert.ok(copy.result.tabs[part], `${locale}: estimate.result.tabs.${part}`)
      assert.ok(copy.result.partTotal[part], `${locale}: estimate.result.partTotal.${part}`)
    }
    for (const key of estimate.ESTIMATE_SCHEDULE_KEYS)
      assert.ok(copy.result.schedule[key], `${locale}: estimate.result.schedule.${key}`)
    for (const column of ['item', 'unit', 'quantity', 'unitPrice', 'amount'])
      assert.ok(copy.result.columns[column], `${locale}: estimate.result.columns.${column}`)
    assert.match(copy.result.money, /\{value\}/, `${locale}: estimate.result.money có {value}`)
  }
  // Nhãn tiếng Việt lấy đúng của app demo (PART_LABELS, partTableHtml, estimateHtml).
  const vi = messages.vi.design.pipeline.estimate.result
  assert.deepEqual(vi.tabs, { structure: 'Phần thô', finishing: 'Hoàn thiện', interior: 'Nội thất' })
  assert.deepEqual(vi.partTotal, {
    structure: 'Tổng phần thô',
    finishing: 'Tổng hoàn thiện',
    interior: 'Tổng nội thất'
  })
  assert.deepEqual(Object.values(vi.columns), ['Hạng mục', 'ĐV', 'Khối lượng', 'Đơn giá', 'Thành tiền'])
  assert.equal(vi.grandTotal, 'Tổng dự toán')
  assert.equal(vi.emptyPart, 'Phần này không có hạng mục nào.')
  assert.equal(vi.money, '{value} đ')
})

// UT-PROJ-477: kiểm dữ liệu thực qua schema, gồm ảnh còn thiếu và trường nội bộ không được đưa vào UI.
const { render3dResultSchema } = await load('src/features/design/schemas/pipeline-api.schema.ts')
const partial3d = {
  contractVersion: 'render3d-v1',
  runId: '6127a540-d6c4-4145-b589-1b3227873936',
  status: 'Running',
  planReady: true,
  progress: { done: 1, total: 2 },
  notes: [],
  items: [
    {
      itemKey: 'exterior_day',
      label: 'Ban ngày',
      groupKey: 'overview',
      groupLabel: 'Ngoại thất',
      floorIndex: null,
      view: 1,
      fileUrl: '/api/v1/estimates/example/stage-files/day',
      width: 1280,
      height: 720
    },
    {
      itemKey: 'exterior_night',
      label: 'Ban đêm',
      groupKey: 'overview',
      groupLabel: 'Ngoại thất',
      floorIndex: null,
      view: 1,
      fileUrl: null,
      width: null,
      height: null
    }
  ]
}
test('3D: đọc ảnh đã lưu và ô chờ mà không loại mất mục chưa có ảnh', () => {
  const actual = render3dResultSchema.parse(partial3d)
  assert.equal(actual.items.length, 2)
  assert.equal(actual.items[1].fileUrl, null)
  assert.deepEqual(actual.progress, { done: 1, total: 2 })
})
test('3D: từ chối contract khác phiên bản và tiến độ âm', () => {
  assert.equal(render3dResultSchema.safeParse({ ...partial3d, contractVersion: 'render3d-v2' }).success, false)
  assert.equal(render3dResultSchema.safeParse({ ...partial3d, progress: { done: -1, total: 2 } }).success, false)
})
test('3D: không giữ prompt hoặc khóa kho ngoài hợp đồng khách hàng', () => {
  const actual = render3dResultSchema.parse({
    ...partial3d,
    prompt: 'private',
    items: partial3d.items.map((i) => ({ ...i, objectKey: 'private' }))
  })
  assert.equal('prompt' in actual, false)
  assert.equal('objectKey' in actual.items[0], false)
})
