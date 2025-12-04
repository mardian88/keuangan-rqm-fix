"use client"

import React, { useEffect, useState } from 'react'
import { X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useToast } from '@/contexts/toast-context'
import { cn } from '@/lib/utils'

interface ToastProps {
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration: number
}

export function Toast({ id, message, type, duration }: ToastProps) {
    const { removeToast } = useToast()
    const [isExiting, setIsExiting] = useState(false)
    const [progress, setProgress] = useState(100)

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                const newProgress = prev - (100 / (duration / 50))
                return newProgress <= 0 ? 0 : newProgress
            })
        }, 50)

        const exitTimer = setTimeout(() => {
            setIsExiting(true)
        }, duration - 300) // Start exit animation slightly before removal

        return () => {
            clearInterval(interval)
            clearTimeout(exitTimer)
        }
    }, [duration])

    const icons = {
        success: <CheckCircle2 className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
        warning: <AlertTriangle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />
    }

    const styles = {
        success: 'border-l-emerald-500 bg-white',
        error: 'border-l-red-500 bg-white',
        warning: 'border-l-amber-500 bg-white',
        info: 'border-l-blue-500 bg-white'
    }

    const iconColors = {
        success: 'text-emerald-500',
        error: 'text-red-500',
        warning: 'text-amber-500',
        info: 'text-blue-500'
    }

    return (
        <div
            className={cn(
                "group relative w-full md:w-[350px] overflow-hidden rounded-lg border border-gray-100 border-l-4 bg-white shadow-lg transition-all duration-300 ease-in-out",
                isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100",
                "animate-in slide-in-from-right-full fade-in duration-300",
                styles[type]
            )}
            role="alert"
        >
            <div className="flex p-4">
                <div className={cn("shrink-0", iconColors[type])}>
                    {icons[type]}
                </div>
                <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                        {message}
                    </p>
                </div>
                <div className="ml-4 flex shrink-0">
                    <button
                        onClick={() => {
                            setIsExiting(true)
                            setTimeout(() => removeToast(id), 300)
                        }}
                        className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 h-1 w-full bg-gray-100">
                <div
                    className={cn("h-full transition-all ease-linear", iconColors[type].replace('text-', 'bg-'))}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    )
}

export function ToastContainer() {
    const { toasts } = useToast()

    if (toasts.length === 0) return null

    return (
        <div
            aria-live="assertive"
            className="fixed bottom-0 right-0 z-[100] flex w-full flex-col gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
        >
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} />
            ))}
        </div>
    )
}
