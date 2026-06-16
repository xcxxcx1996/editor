'use client'

import { Icon } from '@iconify/react'
import type { IconRef } from '@pascal-app/core'
import { lazy, Suspense } from 'react'

export function renderPresentationIcon(icon: IconRef | undefined): React.ReactNode {
  if (!icon) return null

  if (icon.kind === 'url') {
    return <img alt="" className="h-4 w-4 shrink-0 object-contain" src={icon.src} />
  }

  if (icon.kind === 'iconify') {
    return <Icon height={16} icon={icon.name} width={16} />
  }

  if (icon.kind === 'svg') {
    return (
      <svg className="h-4 w-4 shrink-0" viewBox={icon.viewBox}>
        <path d={icon.path} fill="currentColor" />
      </svg>
    )
  }

  const LazyIcon = lazy(icon.module)
  return (
    <Suspense fallback={null}>
      <LazyIcon />
    </Suspense>
  )
}
