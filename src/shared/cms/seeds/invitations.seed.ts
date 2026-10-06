import type { CmsContractorInvitation } from '../cms.types'

/**
 * Lời mời báo giá mẫu — khớp với bốn hồ sơ dự án mẫu của luồng Tìm nhà thầu.
 *
 * Bảng này vốn bắt đầu rỗng vì lời mời do chính khách gửi ở S16/S17. Nhưng nó
 * cũng là nguồn của ba thứ khác: ô đếm "Đã mời x/3" ở hộp thoại chọn dự án, màn
 * theo dõi S18, và hàng đợi của đội vận hành ở `/admin/invitations` (R4) — cả
 * ba đều không demo được nếu phải tự bấm gửi lời mời trước.
 *
 * Ba mốc trạng thái ở đây cố tình khác nhau để thấy đủ các nấc của R4:
 * SVC-2026-0001 đang chạy dở (2/3), SVC-2026-0003 đã kín chỗ (3/3), còn
 * SVC-2026-0004 có một lời mời ở nấc cuối "Hoàn tất" — chính chỗ đó làm hồ sơ
 * chuyển sang "Đã chốt thầu".
 */
const survey = (contractorId: string, date: string, slotId: string) => ({
  contractorId,
  date,
  slotId,
  note: 'Nhờ khảo sát buổi sáng, có mặt chủ nhà.',
  phone: '0912345678',
  email: 'chunha@savico.ai'
})

export const CONTRACTOR_INVITATIONS_SEED: CmsContractorInvitation[] = [
  {
    id: 'INV-2026-0142',
    projectId: 'SVC-2026-0001',
    projectName: 'Nhà phố Tân Lợi 2 tầng',
    contractorId: 'ctr-abc',
    contractorName: 'ABC Construction',
    sentAt: '2026-08-28T02:10:00.000Z',
    status: 'accepted',
    updatedAt: '2026-09-01T04:30:00.000Z',
    steps: [
      { status: 'sent', at: '2026-08-28T02:10:00.000Z' },
      { status: 'received', at: '2026-08-28T08:40:00.000Z' },
      { status: 'accepted', at: '2026-09-01T04:30:00.000Z' }
    ],
    dossierVersion: 'v1',
    fileCount: 2,
    survey: survey('ctr-abc', '2026-09-04', 'slot-1')
  },
  {
    id: 'INV-2026-0143',
    projectId: 'SVC-2026-0001',
    projectName: 'Nhà phố Tân Lợi 2 tầng',
    contractorId: 'ctr-angia',
    contractorName: 'An Gia Build',
    sentAt: '2026-08-28T02:10:00.000Z',
    status: 'received',
    updatedAt: '2026-08-29T03:00:00.000Z',
    steps: [
      { status: 'sent', at: '2026-08-28T02:10:00.000Z' },
      { status: 'received', at: '2026-08-29T03:00:00.000Z' }
    ],
    dossierVersion: 'v1',
    fileCount: 2,
    survey: survey('ctr-angia', '2026-09-05', 'slot-5')
  },

  {
    id: 'INV-2026-0136',
    projectId: 'SVC-2026-0003',
    projectName: 'Cải tạo nhà Q.4',
    contractorId: 'ctr-abc',
    contractorName: 'ABC Construction',
    sentAt: '2026-08-18T01:00:00.000Z',
    status: 'accepted',
    updatedAt: '2026-08-24T02:20:00.000Z',
    steps: [
      { status: 'sent', at: '2026-08-18T01:00:00.000Z' },
      { status: 'received', at: '2026-08-19T02:30:00.000Z' },
      { status: 'accepted', at: '2026-08-24T02:20:00.000Z' }
    ],
    dossierVersion: 'v1',
    fileCount: 3,
    survey: survey('ctr-abc', '2026-08-26', 'slot-1')
  },
  {
    id: 'INV-2026-0137',
    projectId: 'SVC-2026-0003',
    projectName: 'Cải tạo nhà Q.4',
    contractorId: 'ctr-angia',
    contractorName: 'An Gia Build',
    sentAt: '2026-08-18T01:00:00.000Z',
    status: 'received',
    updatedAt: '2026-08-20T04:15:00.000Z',
    steps: [
      { status: 'sent', at: '2026-08-18T01:00:00.000Z' },
      { status: 'received', at: '2026-08-20T04:15:00.000Z' }
    ],
    dossierVersion: 'v1',
    fileCount: 3,
    survey: survey('ctr-angia', '2026-08-27', 'slot-5')
  },
  {
    id: 'INV-2026-0138',
    projectId: 'SVC-2026-0003',
    projectName: 'Cải tạo nhà Q.4',
    contractorId: 'ctr-hungphat',
    contractorName: 'Hưng Phát Home',
    sentAt: '2026-08-18T01:00:00.000Z',
    status: 'sent',
    updatedAt: '2026-08-18T01:00:00.000Z',
    steps: [{ status: 'sent', at: '2026-08-18T01:00:00.000Z' }],
    dossierVersion: 'v1',
    fileCount: 3,
    survey: survey('ctr-hungphat', '2026-08-28', 'slot-2')
  },

  {
    id: 'INV-2026-0121',
    projectId: 'SVC-2026-0004',
    projectName: 'Nhà vườn Hòa Thắng',
    contractorId: 'ctr-abc',
    contractorName: 'ABC Construction',
    sentAt: '2026-07-02T02:00:00.000Z',
    status: 'done',
    updatedAt: '2026-07-18T02:45:00.000Z',
    steps: [
      { status: 'sent', at: '2026-07-02T02:00:00.000Z' },
      { status: 'received', at: '2026-07-03T03:30:00.000Z' },
      { status: 'accepted', at: '2026-07-08T06:00:00.000Z' },
      { status: 'done', at: '2026-07-18T02:45:00.000Z' }
    ],
    dossierVersion: 'v1',
    fileCount: 1,
    survey: survey('ctr-abc', '2026-07-06', 'slot-1')
  }
]
