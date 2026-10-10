'use client'

import { InputNumber, type InputNumberProps } from 'antd'

import { formatMoneyInput, parseMoneyInput } from '@/shared/utils'

/**
 * Ô nhập TIỀN (VND) của khu quản trị: luôn hiện dấu chấm ngăn hàng nghìn — `1.000`, `1.000.000`,
 * `1.000.000.000` (góp ý case 17) — và chỉ nhận số nguyên. Dùng thay `InputNumber` cho mọi số tiền để các ô
 * không lệch nhau; các thuộc tính còn lại (`min`, `step`, `suffix`…) truyền như `InputNumber`.
 */
export function MoneyInput(props: InputNumberProps<string | number>) {
  return (
    <InputNumber<string | number>
      precision={0}
      formatter={formatMoneyInput}
      parser={parseMoneyInput}
      suffix='₫'
      style={{ width: '100%' }}
      {...props}
    />
  )
}
