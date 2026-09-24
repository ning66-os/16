import { create } from 'zustand'
import type { Annotation, AnnotationTool, ViewerState } from '../types'

interface ViewerStore extends ViewerState {
  setCaseId: (id: number | null) => void
  setAnnotations: (annotations: Annotation[]) => void
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (annotation: Annotation) => void
  removeAnnotation: (id: number) => void
  setSelectedAnnotation: (annotation: Annotation | null) => void
  setCurrentTool: (tool: AnnotationTool) => void
  setIsDrawingPath: (drawing: boolean) => void
  addPathPoint: (point: { x: number; y: number; z: number }) => void
  clearPathPoints: () => void
  reset: () => void
}

export const useViewerStore = create<ViewerStore>((set) => ({
  caseId: null,
  annotations: [],
  selectedAnnotation: null,
  currentTool: 'select',
  isDrawingPath: false,
  pathPoints: [],

  setCaseId: (id) => set({ caseId: id }),
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) =>
    set((state) => ({
      annotations: [...state.annotations, annotation],
    })),
  updateAnnotation: (annotation) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotation.id ? annotation : a
      ),
      selectedAnnotation:
        state.selectedAnnotation?.id === annotation.id
          ? annotation
          : state.selectedAnnotation,
    })),
  removeAnnotation: (id) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== id),
      selectedAnnotation:
        state.selectedAnnotation?.id === id ? null : state.selectedAnnotation,
    })),
  setSelectedAnnotation: (annotation) => set({ selectedAnnotation: annotation }),
  setCurrentTool: (tool) => set({ currentTool: tool, selectedAnnotation: null }),
  setIsDrawingPath: (drawing) => set({ isDrawingPath: drawing }),
  addPathPoint: (point) =>
    set((state) => ({
      pathPoints: [...state.pathPoints, point],
    })),
  clearPathPoints: () => set({ pathPoints: [] }),
  reset: () =>
    set({
      caseId: null,
      annotations: [],
      selectedAnnotation: null,
      currentTool: 'select',
      isDrawingPath: false,
      pathPoints: [],
    }),
}))
