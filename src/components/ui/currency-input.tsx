import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatInputCurrency, parseCurrency } from "@/lib/currency"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: number
    onValueChange?: (value: number) => void
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ value, onValueChange, ...props }, ref) => {
        const [displayValue, setDisplayValue] = React.useState('')

        React.useEffect(() => {
            if (value !== undefined) {
                setDisplayValue(value > 0 ? formatInputCurrency(value.toString()) : '')
            }
        }, [value])

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value
            const formatted = formatInputCurrency(inputValue)
            setDisplayValue(formatted)

            if (onValueChange) {
                const numericValue = parseCurrency(formatted)
                onValueChange(numericValue)
            }
        }

        return (
            <Input
                {...props}
                ref={ref}
                type="text"
                value={displayValue}
                onChange={handleChange}
                placeholder="0"
            />
        )
    }
)

CurrencyInput.displayName = "CurrencyInput"
