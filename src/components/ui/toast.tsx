"use client"

import React, { useEffect, useState } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { useToast } from '@/contexts/toast-context'
import { cn } from '@/lib/utils'

interface ToastProps {
    id: string
    title: string
    description?: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration: number
}

export function Toast({ id, title, description, type, duration }: ToastProps) {
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
        }, duration - 300)

        return () => {
            clearInterval(interval)
            clearTimeout(exitTimer)
        }
    }, [duration])

    const icons = {
        success: <Check className="h-6 w-6 text-white" />,
        error: <span className="text-2xl font-bold text-white">!</span>,
        warning: <AlertCircle className="h-6 w-6 text-white" />,
        info: <AlertCircle className="h-6 w-6 text-white" />
    }

    // Styles based on the user's provided image (Soft Green/Red backgrounds)
    const containerStyles = {
        success: 'bg-[#D1E7DD] border-[#A8D5BA]', // Soft Green
        error: 'bg-[#F8D7DA] border-[#F5C2C7]',   // Soft Red
        warning: 'bg-[#FFF3CD] border-[#FFECB5]', // Soft Yellow
        info: 'bg-[#CFF4FC] border-[#B6EFFB]'     // Soft Blue
    }

    // Circle icon background colors
    const iconContainerStyles = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        warning: 'bg-amber-500',
        info: 'bg-blue-400'
    }

    const progressStyles = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        warning: 'bg-amber-500',
        info: 'bg-blue-400'
    }

    return (
        <div
            className={cn(
                "group relative w-[400px] overflow-hidden rounded-2xl shadow-lg transition-all duration-300 ease-in-out border",
                isExiting ? "translate-y-[-100%] opacity-0" : "translate-y-0 opacity-100",
                "animate-in slide-in-from-top-full fade-in duration-300",
                containerStyles[type]
            )}
            role="alert"
        >
            <div className="flex items-center p-4">
                {/* Icon Container */}
                <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-sm",
                    iconContainerStyles[type]
                )}>
                    {icons[type]}
                </div>

                {/* Content */}
                <div className="ml-4 flex-1">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">
                        {title}
                    </h3>
                    {description && (
                        <p className="mt-1 text-sm text-gray-700 leading-snug">
                            {description}
                        </p>
                    )}
                </div>

                {/* Close Button */}
                <button
                    onClick={() => {
                        setIsExiting(true)
                        setTimeout(() => removeToast(id), 300)
                    }}
                    className="ml-2 -mt-8 text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-white/50">
                <div
                    className={cn("h-full transition-all ease-linear", progressStyles[type])}
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
            className="fixed top-1/2 left-1/2 z-[100] flex w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 px-4"
        >
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} />
            ))}
        </div>
    )
}
