'use client'

import React, { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type AlbumItem = {
  _id: string
  name: string
  alias: string
  parentAlbumId?: string | null
  level: number
  order: number
  childAlbumCount?: number
}

export interface AlbumTreeNode extends AlbumItem {
  children: AlbumTreeNode[]
}

function buildTree(albums: AlbumItem[]): AlbumTreeNode[] {
  const byId = new Map<string, AlbumTreeNode>()
  albums.forEach(a => byId.set(a._id, { ...a, children: [] }))
  const roots: AlbumTreeNode[] = []
  byId.forEach(node => {
    const parentId = node.parentAlbumId ?? null
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  const sortRecursive = (nodes: AlbumTreeNode[]) => {
    nodes.sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name))
    nodes.forEach(n => sortRecursive(n.children))
  }
  sortRecursive(roots)
  return roots
}

function flatten(nodes: AlbumTreeNode[]): AlbumTreeNode[] {
  const out: AlbumTreeNode[] = []
  const walk = (arr: AlbumTreeNode[]) => {
    for (const n of arr) {
      out.push(n)
      if (n.children.length) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

import Link from 'next/link'

function TreeRow({ node, renderActions, onOpen }: { node: AlbumTreeNode; renderActions?: (node: AlbumTreeNode) => React.ReactNode; onOpen?: (node: AlbumTreeNode) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: node._id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-1 px-2 cursor-pointer" onClick={() => onOpen?.(node)}>
      <span className="text-muted-foreground select-none" style={{ width: 16 * Math.max(0, node.level) }} />
      <button aria-label="drag" {...listeners} {...attributes} className="cursor-move text-muted-foreground">⋮⋮</button>
      <div className="flex-1 truncate">
        <span className="font-medium">{node.name}</span>
        <span className="ml-2 text-xs text-muted-foreground">/{node.alias}</span>
      </div>
      <div className="flex items-center gap-2">
        {typeof node.childAlbumCount === 'number' && (
          <span className="text-xs text-muted-foreground">{node.childAlbumCount}</span>
        )}
        {renderActions?.(node)}
      </div>
    </div>
  )
}

export function AlbumTree({
  albums,
  onReorder,
  renderActions,
  onOpen,
}: {
  albums: AlbumItem[]
  onReorder: (updates: Array<{ id: string; parentAlbumId: string | null; order: number }>) => Promise<void>
  renderActions?: (node: AlbumTreeNode) => React.ReactNode
  onOpen?: (node: AlbumTreeNode) => void
}) {
  const [localAlbums, setLocalAlbums] = useState(albums)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const tree = useMemo(() => buildTree(localAlbums), [localAlbums])
  const flat = useMemo(() => flatten(tree), [tree])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const fromIndex = flat.findIndex(n => n._id === active.id)
    const toIndex = flat.findIndex(n => n._id === over.id)
    if (fromIndex === -1 || toIndex === -1) return

    // Same parent, reorder indices locally
    const activeNode = flat[fromIndex]
    const overNode = flat[toIndex]
    if ((activeNode.parentAlbumId ?? null) === (overNode.parentAlbumId ?? null)) {
      const siblings = localAlbums
        .filter(a => (a.parentAlbumId ?? null) === (activeNode.parentAlbumId ?? null))
        .sort((a,b) => (a.order - b.order) || a.name.localeCompare(b.name))
      const ids = siblings.map(s => s._id)
      const from = ids.indexOf(activeNode._id)
      const to = ids.indexOf(overNode._id)
      if (from === -1 || to === -1) return
      const newIds = arrayMove(ids, from, to)
      const updates: Array<{ id: string; parentAlbumId: string | null; order: number }> = newIds.map((id, idx) => ({ id, parentAlbumId: activeNode.parentAlbumId ?? null, order: idx }))
      setLocalAlbums(prev => prev.map(a => {
        const u = updates.find(x => x.id === a._id)
        return u ? { ...a, order: u.order } : a
      }))
      await onReorder(updates)
      return
    }
    // Different parent moves can be implemented later (out of scope for now)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="border rounded-md overflow-hidden bg-background text-foreground">
        {tree.map(parent => (
          <div key={parent._id} className="border-b">
            <SortableContext items={[parent._id, ...parent.children.map(c => c._id)]} strategy={verticalListSortingStrategy}>
              <TreeRow node={parent} renderActions={renderActions} onOpen={onOpen} />
              {parent.children.map(child => (
                <TreeRow key={child._id} node={child} renderActions={renderActions} onOpen={onOpen} />
              ))}
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  )
}

export default AlbumTree
