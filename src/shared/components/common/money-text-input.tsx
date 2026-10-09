'use client'

import { useLayoutEffect, useReducer, useRef, type ComponentProps } from 'react'

import { Input } from '@/shared/components/ui/input'
import { caretAfterDigits, formatMoneyInput, parseMoneyInput } from '@/shared/utils'

type MoneyTextInputProps = Omit<
  ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'value' | 'defaultValue' | 'onChange'
> & {
  /** Số tiền dạng chuỗi chữ số (`'1850000000'`). Chuỗi đã có dấu chấm cũng được, ô tự nhóm lại. */
  value: string
  /** Nhận chuỗi CHỈ gồm chữ số — dấu chấm chỉ để hiển thị, không bao giờ đi vào dữ liệu của form. */
  onValueChange: (digits: string) => void
}

/**
 * Ô nhập TIỀN (VND) cho form phía khách: hiện dấu chấm ngăn mỗi 3 số — `1.850.000.000` — ngay lúc gõ và khi dán.
 *
 * Dùng khi form giữ số tiền dạng chuỗi (react-hook-form + shadcn `Input`). Khu quản trị dùng `MoneyInput` (antd
 * `InputNumber`) với cùng quy ước định dạng. Chỉ nhận số nguyên; ký tự khác chữ số bị bỏ.
 */
export function MoneyTextInput({ value, onValueChange, ref, ...props }: MoneyTextInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const digitsBeforeCaret = useRef<number | null>(null)
  // Gõ ký tự không phải số thì giá trị không đổi, React không vẽ lại và DOM vẫn giữ ký tự lạ — buộc vẽ lại để ô về đúng.
  const [, redraw] = useReducer((count: number) => count + 1, 0)
  const shown = formatMoneyInput(value)

  // Dấu chấm mới chèn vào làm con trỏ nhảy về cuối; đặt lại ngay sau chữ số người dùng vừa gõ, trước khi trình duyệt vẽ.
  useLayoutEffect(() => {
    const input = inputRef.current
    const pending = digitsBeforeCaret.current
    digitsBeforeCaret.current = null
    if (pending === null || !input || document.activeElement !== input) return
    const caret = caretAfterDigits(shown, pending)
    input.setSelectionRange(caret, caret)
  })

  return (
    <Input
      {...props}
      ref={(node) => {
        inputRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      type='text'
      inputMode='numeric'
      autoComplete='off'
      value={shown}
      onChange={(event) => {
        const typed = event.target.value
        digitsBeforeCaret.current = parseMoneyInput(typed.slice(0, event.target.selectionStart ?? typed.length)).length
        // Bỏ số 0 đứng đầu: `007` không phải số tiền người dùng muốn nhập.
        onValueChange(parseMoneyInput(typed).replace(/^0+(?=\d)/, ''))
        redraw()
      }}
    />
  )
}
