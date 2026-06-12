'use client'

import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, type Object3D } from 'three'

type CameraControlsImpl = {
  fitToBox: (
    target: Object3D,
    enableTransition: boolean,
    options?: {
      paddingTop?: number
      paddingBottom?: number
      paddingLeft?: number
      paddingRight?: number
    },
  ) => Promise<unknown>
}

export function CellAutoFit({ trigger }: { trigger: number }) {
  const sceneRoot = useThree((s) => s.scene)
  const controls = useThree((s) => s.controls) as CameraControlsImpl | null
  const lastFitRef = useRef(-1)

  useEffect(() => {
    if (!controls || trigger === lastFitRef.current) return

    let cancelled = false
    let innerId = 0
    const outerId = requestAnimationFrame(() => {
      if (cancelled) return
      innerId = requestAnimationFrame(() => {
        if (cancelled) return
        const box = new Box3().setFromObject(sceneRoot)
        if (!box.isEmpty()) {
          void controls.fitToBox(sceneRoot, true, {
            paddingTop: 0.4,
            paddingBottom: 0.4,
            paddingLeft: 0.4,
            paddingRight: 0.4,
          })
          lastFitRef.current = trigger
        }
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(outerId)
      cancelAnimationFrame(innerId)
    }
  }, [trigger, sceneRoot, controls])

  return null
}
