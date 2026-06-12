'use client'

import { sceneRegistry, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Box3, type Camera, type Object3D, OrthographicCamera, Vector3 } from 'three'

const ISO_DIRECTION = new Vector3(1, 1, 1).normalize()
const ENTRY_CAMERA_DISTANCE = 10
const INITIAL_FRAME_PADDING = 1.15

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
  setLookAt?: (
    positionX: number,
    positionY: number,
    positionZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    enableTransition?: boolean,
  ) => Promise<unknown>
  zoomTo?: (zoom: number, enableTransition?: boolean) => Promise<unknown>
}

const FIT_PADDING = {
  paddingTop: 0.08,
  paddingBottom: 0.08,
  paddingLeft: 0.08,
  paddingRight: 0.08,
}

export function CellCameraController({
  entryKey,
  fitTrigger,
}: {
  entryKey: number
  fitTrigger: number
}) {
  const rootNodeIds = useScene((s) => s.rootNodeIds)
  const controls = useThree((s) => s.controls) as CameraControlsImpl | null
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const size = useThree((s) => s.size)
  const lastEntryRef = useRef(-1)
  const lastFitRef = useRef(-1)

  useEffect(() => {
    useViewer.getState().setCameraMode('orthographic')
    const unsubscribe = useViewer.subscribe((state) => {
      if (state.cameraMode !== 'orthographic') {
        useViewer.getState().setCameraMode('orthographic')
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!controls || lastEntryRef.current === entryKey) return
    lastEntryRef.current = entryKey
    let cancelled = false

    let frame = 0
    const runEntryFrame = () => {
      if (cancelled) return
      frame += 1
      const rootObject = getRootObject(rootNodeIds)
      if (!rootObject) {
        if (frame < 12) requestAnimationFrame(runEntryFrame)
        return
      }

      frameInitialView(rootObject, controls, camera, size.width, size.height)
      invalidate()
    }

    const id = requestAnimationFrame(runEntryFrame)

    return () => {
      cancelled = true
      cancelAnimationFrame(id)
    }
  }, [camera, controls, entryKey, invalidate, rootNodeIds, size.height, size.width])

  useEffect(() => {
    if (!controls || fitTrigger === lastFitRef.current) return
    lastFitRef.current = fitTrigger

    let cancelled = false
    let innerId = 0
    const outerId = requestAnimationFrame(() => {
      if (cancelled) return
      innerId = requestAnimationFrame(() => {
        if (!cancelled) void fitScene(rootNodeIds, controls, true)
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(outerId)
      cancelAnimationFrame(innerId)
    }
  }, [camera, fitTrigger, rootNodeIds, controls])

  return null
}

async function fitScene(
  rootNodeIds: string[],
  controls: CameraControlsImpl,
  enableTransition: boolean,
) {
  const rootObject = getRootObject(rootNodeIds)
  if (!rootObject) return
  await controls.fitToBox(rootObject, enableTransition, FIT_PADDING)
}

function getRootObject(rootNodeIds: string[]) {
  return rootNodeIds
    .map((id) => sceneRegistry.nodes.get(id))
    .find((object): object is Object3D => Boolean(object))
}

function frameInitialView(
  rootObject: Object3D,
  controls: CameraControlsImpl,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
) {
  const box = new Box3().setFromObject(rootObject)
  if (box.isEmpty()) return

  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const nextPosition = center.clone().addScaledVector(ISO_DIRECTION, ENTRY_CAMERA_DISTANCE)

  camera.position.copy(nextPosition)
  camera.up.set(0, 1, 0)
  camera.lookAt(center)

  void controls.setLookAt?.(
    nextPosition.x,
    nextPosition.y,
    nextPosition.z,
    center.x,
    center.y,
    center.z,
    false,
  )

  if (camera instanceof OrthographicCamera) {
    const paddedWidth = Math.max(size.x * INITIAL_FRAME_PADDING, 1e-4)
    const paddedHeight = Math.max(size.y * INITIAL_FRAME_PADDING, 1e-4)
    const baseWidth = camera.right - camera.left
    const baseHeight = camera.top - camera.bottom
    const zoomForWidth = baseWidth / paddedWidth
    const zoomForHeight = baseHeight / paddedHeight
    const nextZoom = Math.min(zoomForWidth, zoomForHeight)

    camera.zoom = Math.max(nextZoom, 1)
    camera.updateProjectionMatrix()
    void controls.zoomTo?.(camera.zoom, false)
  }
}
