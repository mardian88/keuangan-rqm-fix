// Format number with thousand separator (dot)
export function formatCurrency(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '0'
    return num.toLocaleString('id-ID')
}

// Parse formatted string back to number
export function parseCurrency(value: string): number {
    const cleaned = value.replace(/\./g, '').replace(/,/g, '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
}

// Format input as user types
export function formatInputCurrency(value: string): string {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    if (!digits) return ''

    // Convert to number and format
    const num = parseInt(digits, 10)
    return formatCurrency(num)
}
