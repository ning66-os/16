import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Annotation } from '../../types'

interface BuildingViewerProps {
  annotations: Annotation[]
  onAnnotationClick: (annotation: Annotation) => void
  onCanvasClick: (point: THREE.Vector3) => void
  onPathPointClick?: (point: THREE.Vector3) => void
  isDrawingPath: boolean
  pathPoints: Array<{ x: number; y: number; z: number }>
}

const disposeObject = (obj: THREE.Object3D) => {
  obj.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.LineSegments
    ) {
      child.geometry?.dispose()
      const material = child.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose())
      } else {
        material?.dispose()
      }
    }
  })
}

export default function BuildingViewer({
  annotations,
  onAnnotationClick,
  onCanvasClick,
  onPathPointClick,
  isDrawingPath,
  pathPoints,
}: BuildingViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const annotationObjectsRef = useRef<Map<number, THREE.Object3D>>(new Map())
  const pathGroupRef = useRef<THREE.Group | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null)

  const createBuilding = useCallback((scene: THREE.Scene) => {
    const buildingGroup = new THREE.Group()

    const mainBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(20, 15, 15),
      new THREE.MeshStandardMaterial({
        color: 0xd4d4d4,
        roughness: 0.8,
        metalness: 0.2,
      })
    )
    mainBuilding.position.set(0, 7.5, 0)
    mainBuilding.castShadow = true
    mainBuilding.receiveShadow = true
    buildingGroup.add(mainBuilding)

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(22, 1, 17),
      new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.9,
      })
    )
    roof.position.set(0, 15.5, 0)
    buildingGroup.add(roof)

    for (let floor = 0; floor < 3; floor++) {
      for (let i = 0; i < 3; i++) {
        const window1 = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 2, 0.1),
          new THREE.MeshStandardMaterial({
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.6,
          })
        )
        window1.position.set(-6 + i * 6, 2.5 + floor * 5, 7.55)
        buildingGroup.add(window1)

        const window2 = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 2, 0.1),
          new THREE.MeshStandardMaterial({
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.6,
          })
        )
        window2.position.set(-6 + i * 6, 2.5 + floor * 5, -7.55)
        buildingGroup.add(window2)
      }
    }

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x4a3728,
      })
    )
    door.position.set(0, 1.5, 7.55)
    buildingGroup.add(door)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        color: 0x3d5c3d,
        roughness: 1,
      })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    ground.receiveShadow = true
    scene.add(ground)

    const gridHelper = new THREE.GridHelper(60, 60, 0x888888, 0xcccccc)
    gridHelper.position.y = 0.01
    scene.add(gridHelper)

    scene.add(buildingGroup)
    return buildingGroup
  }, [])

  const createFireOriginMarker = useCallback(
    (annotation: Annotation, scene: THREE.Scene) => {
      const { x, y, z } = annotation.position

      const markerGroup = new THREE.Group()

      const fireColor = new THREE.Color(0xff4500)

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        new THREE.MeshBasicMaterial({
          color: fireColor,
          transparent: true,
          opacity: 0.8,
        })
      )
      markerGroup.add(sphere)

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 32, 32),
        new THREE.MeshBasicMaterial({
          color: fireColor,
          transparent: true,
          opacity: 0.3,
        })
      )
      markerGroup.add(glow)

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 1, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffff00,
        })
      )
      cone.position.y = 1.2
      markerGroup.add(cone)

      markerGroup.position.set(x, y, z)
      markerGroup.userData = { annotationId: annotation.id, type: 'fire_origin' }

      scene.add(markerGroup)
      annotationObjectsRef.current.set(annotation.id, markerGroup)
    },
    []
  )

  const createSmokePath = useCallback(
    (annotation: Annotation, scene: THREE.Scene) => {
      const points = annotation.position.points || [
        annotation.position,
        { x: annotation.position.x, y: annotation.position.y + 5, z: annotation.position.z },
      ]

      const group = new THREE.Group()
      group.userData = { annotationId: annotation.id, type: 'smoke_path' }

      const curvePoints = points.map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      )

      const curve = new THREE.CatmullRomCurve3(curvePoints)
      const geometryPoints = curve.getPoints(50)
      const geometry = new THREE.BufferGeometry().setFromPoints(geometryPoints)

      const material = new THREE.LineBasicMaterial({
        color: 0x666666,
        linewidth: 3,
        transparent: true,
        opacity: 0.7,
      })

      const line = new THREE.Line(geometry, material)
      line.userData = { annotationId: annotation.id, type: 'smoke_path' }

      group.add(line)

      points.forEach((p, index) => {
        const smokeParticle = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 16, 16),
          new THREE.MeshBasicMaterial({
            color: 0x999999,
            transparent: true,
            opacity: 0.5,
          })
        )
        smokeParticle.position.set(p.x, p.y, p.z)
        smokeParticle.userData = {
          annotationId: annotation.id,
          type: 'smoke_path',
          pointIndex: index,
        }
        group.add(smokeParticle)
      })

      scene.add(group)
      annotationObjectsRef.current.set(annotation.id, group)
    },
    []
  )

  const createEvacuationRoute = useCallback(
    (annotation: Annotation, scene: THREE.Scene) => {
      const points = annotation.position.points || [
        annotation.position,
        { x: annotation.position.x, y: annotation.position.y, z: annotation.position.z + 5 },
      ]

      const group = new THREE.Group()
      group.userData = { annotationId: annotation.id, type: 'evacuation_route' }

      const curvePoints = points.map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      )

      const curve = new THREE.CatmullRomCurve3(curvePoints)
      const geometryPoints = curve.getPoints(50)
      const geometry = new THREE.BufferGeometry().setFromPoints(geometryPoints)

      const material = new THREE.LineDashedMaterial({
        color: 0x22c55e,
        linewidth: 3,
        dashSize: 0.5,
        gapSize: 0.3,
        transparent: true,
        opacity: 0.9,
      })

      const line = new THREE.Line(geometry, material)
      line.computeLineDistances()
      line.userData = { annotationId: annotation.id, type: 'evacuation_route' }
      group.add(line)

      points.forEach((p, index) => {
        const routePoint = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 16, 16),
          new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.8,
          })
        )
        routePoint.position.set(p.x, p.y, p.z)
        routePoint.userData = {
          annotationId: annotation.id,
          type: 'evacuation_route',
          pointIndex: index,
        }
        group.add(routePoint)
      })

      scene.add(group)
      annotationObjectsRef.current.set(annotation.id, group)
    },
    []
  )

  const createHazardMarker = useCallback(
    (annotation: Annotation, scene: THREE.Scene) => {
      const { x, y, z } = annotation.position

      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.7,
        })
      )
      marker.position.set(x, y, z)
      marker.userData = { annotationId: annotation.id, type: 'hazard' }

      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.8, 0.8))
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffffff })
      )
      marker.add(line)

      scene.add(marker)
      annotationObjectsRef.current.set(annotation.id, marker)
    },
    []
  )

  const updatePathLine = useCallback((scene: THREE.Scene) => {
    if (pathGroupRef.current) {
      scene.remove(pathGroupRef.current)
      disposeObject(pathGroupRef.current)
      pathGroupRef.current = null
    }

    if (pathPoints.length > 0) {
      const group = new THREE.Group()

      const points = pathPoints.map(
        (p) => new THREE.Vector3(p.x, p.y, p.z)
      )
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineDashedMaterial({
        color: 0xffff00,
        linewidth: 2,
        dashSize: 0.3,
        gapSize: 0.2,
      })
      const line = new THREE.Line(geometry, material)
      line.computeLineDistances()
      group.add(line)

      pathPoints.forEach((p) => {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xffff00 })
        )
        dot.position.set(p.x, p.y, p.z)
        group.add(dot)
      })

      scene.add(group)
      pathGroupRef.current = group
    }
  }, [pathPoints])

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87ceeb)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(30, 25, 30)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 10
    controls.maxDistance = 100
    controls.maxPolarAngle = Math.PI / 2 - 0.1
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(20, 40, 20)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.camera.left = -50
    directionalLight.shadow.camera.right = 50
    directionalLight.shadow.camera.top = 50
    directionalLight.shadow.camera.bottom = -50
    scene.add(directionalLight)

    createBuilding(scene)

    let animationId = 0
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      controls.update()

      annotationObjectsRef.current.forEach((obj) => {
        if (obj.userData.type === 'fire_origin') {
          const time = Date.now() * 0.003
          const scale = 1 + Math.sin(time) * 0.2
          obj.scale.set(scale, scale, scale)
        }
      })

      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationId)
      controls.dispose()
      scene.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh ||
          obj instanceof THREE.Line ||
          obj instanceof THREE.LineSegments
        ) {
          obj.geometry?.dispose()
          const material = obj.material as THREE.Material | THREE.Material[] | undefined
          if (Array.isArray(material)) {
            material.forEach((m) => m.dispose())
          } else {
            material?.dispose()
          }
        }
      })
      annotationObjectsRef.current.clear()
      pathGroupRef.current = null
      renderer.dispose()
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement)
      }
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
    }
  }, [createBuilding])

  useEffect(() => {
    if (!sceneRef.current) return

    annotationObjectsRef.current.forEach((obj) => {
      sceneRef.current!.remove(obj)
      disposeObject(obj)
    })
    annotationObjectsRef.current.clear()

    annotations.forEach((annotation) => {
      switch (annotation.annotation_type) {
        case 'fire_origin':
          createFireOriginMarker(annotation, sceneRef.current!)
          break
        case 'smoke_path':
          createSmokePath(annotation, sceneRef.current!)
          break
        case 'evacuation_route':
          createEvacuationRoute(annotation, sceneRef.current!)
          break
        case 'hazard':
          createHazardMarker(annotation, sceneRef.current!)
          break
      }
    })
  }, [annotations, createFireOriginMarker, createSmokePath, createEvacuationRoute, createHazardMarker])

  useEffect(() => {
    if (sceneRef.current) {
      updatePathLine(sceneRef.current)
    }
  }, [pathPoints, updatePathLine])

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return

      const pointerDown = pointerDownPosRef.current
      if (pointerDown) {
        const dx = event.clientX - pointerDown.x
        const dy = event.clientY - pointerDown.y
        if (Math.sqrt(dx * dx + dy * dy) > 5) return
      }

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current)

      const allObjects: THREE.Object3D[] = []
      annotationObjectsRef.current.forEach((obj) => allObjects.push(obj))

      const intersects = raycasterRef.current.intersectObjects(allObjects, true)

      if (intersects.length > 0) {
        const clickedObject = intersects[0].object
        let annotationId = clickedObject.userData.annotationId
        let currentObj = clickedObject
        while (!annotationId && currentObj.parent) {
          currentObj = currentObj.parent
          annotationId = currentObj.userData?.annotationId
        }

        if (annotationId !== undefined) {
          const annotation = annotations.find((a) => a.id === annotationId)
          if (annotation) {
            onAnnotationClick(annotation)
            return
          }
        }
      }

      const groundIntersects = raycasterRef.current.intersectObjects(
        sceneRef.current.children.filter(
          (c): c is THREE.Mesh =>
            c instanceof THREE.Mesh && c.geometry instanceof THREE.PlaneGeometry
        ),
        false
      )

      if (groundIntersects.length > 0) {
        const point = groundIntersects[0].point
        if (isDrawingPath && onPathPointClick) {
          onPathPointClick(point)
        } else {
          onCanvasClick(point)
        }
      }
    },
    [annotations, onAnnotationClick, onCanvasClick, onPathPointClick, isDrawingPath]
  )

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden"
      onPointerDown={(event) => {
        pointerDownPosRef.current = { x: event.clientX, y: event.clientY }
      }}
      onClick={handleClick}
      style={{ cursor: isDrawingPath ? 'crosshair' : 'pointer' }}
    />
  )
}
