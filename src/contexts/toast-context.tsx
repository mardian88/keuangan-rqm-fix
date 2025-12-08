"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
    id: string
    title: string
    description?: string
    type: ToastType
    duration: number
}

interface ToastContextType {
    toasts: Toast[]
    showToast: (title: string, type?: ToastType, description?: string, duration?: number) => void
    removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((title: string, type: ToastType = 'info', description?: string, duration: number = 3000) => {
        const id = Math.random().toString(36).substring(7)
        const newToast: Toast = { id, title, description, type, duration }

        setToasts(prev => [...prev, newToast])

        setTimeout(() => {
            removeToast(id)
        }, duration)
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
            {children}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within ToastProvider')
    }
    return context
}
