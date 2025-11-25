'use client'

import React, { useMemo, useState, useEffect } from 'react'
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
    nodes.sort((a, b) => {
      const orderA = a.order ?? 0
      const orderB = b.order ?? 0
      if (orderA !== orderB) {
        return orderA - orderB
      }
      return a.name.localeCompare(b.name)
    })
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

function TreeRow({ 
  node, 
  renderActions, 
  onOpen,
  isExpanded,
  onToggleExpand,
  showAccordion
}: { 
  node: AlbumTreeNode
  renderActions?: (node: AlbumTreeNode) => React.ReactNode
  onOpen?: (node: AlbumTreeNode) => void
  isExpanded?: boolean
  onToggleExpand?: () => void
  showAccordion?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ 
    id: node._id,
    data: { node }
  })
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: node._id,
    data: { node }
  })
  
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isOver ? 'rgba(59, 130, 246, 0.1)' : undefined,
  }
  
  const hasChildren = node.children.length > 0
  
  // Combine refs for both draggable and droppable
  const combinedRef = (element: HTMLDivElement | null) => {
    setNodeRef(element)
    setDroppableRef(element)
  }
  
  return (
    <div ref={combinedRef} style={style} className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-50" onClick={() => onOpen?.(node)}>
      <span className="text-muted-foreground select-none" style={{ width: 16 * Math.max(0, node.level) }} />
      
      {/* Accordion toggle for level 2 nodes */}
      {showAccordion ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand?.()
          }}
          className={`w-6 h-6 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-all flex-shrink-0 ${
            hasChildren ? '' : 'opacity-50 cursor-default'
          }`}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          title={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : 'No children'}
          disabled={!hasChildren}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <span className="w-4" />
      )}
      
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

function TreeNode({ 
  node, 
  renderActions, 
  onOpen,
  expandedNodes,
  onToggleNode
}: { 
  node: AlbumTreeNode
  renderActions?: (node: AlbumTreeNode) => React.ReactNode
  onOpen?: (node: AlbumTreeNode) => void
  expandedNodes?: Set<string>
  onToggleNode: (nodeId: string) => void
}) {
  // Show accordion button on level 1 nodes (second level in 1-indexed counting)
  // BUT only if they have children (sub-albums)
  // Level 1 nodes can toggle visibility of level 2+ children
  // Level 2+ nodes don't show accordion button themselves
  const hasChildren = node.children.length > 0
  const showAccordion = node.level === 1 && hasChildren
  // Ensure expandedNodes is always a Set
  const safeExpandedNodes = expandedNodes || new Set<string>()
  const isExpanded = safeExpandedNodes.has(node._id)
  
  // Determine if children should be shown:
  // - Level 0: always show children (root level, no accordion)
  // - Level 1: show children (level 2+) only if expanded (accordion closed by default)
  // - Level 2+: always show children (they're already filtered by level 1 parent's expansion state)
  let shouldShowChildren: boolean
  if (node.level < 1) {
    // Level 0: always show children (root level)
    shouldShowChildren = true
  } else if (node.level === 1) {
    // Level 1: show children (level 2+) only if expanded (default: collapsed)
    shouldShowChildren = isExpanded
  } else {
    // Level 2+: always show children (parent level 1 controls visibility)
    // Note: Level 2+ nodes won't be rendered if their level 1 parent is not expanded
    shouldShowChildren = true
  }
  
  return (
    <>
      <TreeRow 
        node={node} 
        renderActions={renderActions} 
        onOpen={onOpen}
        isExpanded={isExpanded}
        onToggleExpand={() => onToggleNode(node._id)}
        showAccordion={showAccordion}
      />
      {shouldShowChildren && (
        <div className={showAccordion ? 'ml-4 border-l border-gray-200' : ''}>
          {node.children.map(child => (
            <TreeNode 
              key={child._id} 
              node={child} 
              renderActions={renderActions} 
              onOpen={onOpen}
              expandedNodes={safeExpandedNodes}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      )}
    </>
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Sync localAlbums when albums prop changes
  useEffect(() => {
    setLocalAlbums(albums)
  }, [albums])

  // Rebuild tree whenever localAlbums changes
  const tree = useMemo(() => {
    // Ensure all albums have order field
    const normalizedAlbums = localAlbums.map(a => ({
      ...a,
      order: a.order ?? 0
    }))
    return buildTree(normalizedAlbums)
  }, [localAlbums])
  
  const flat = useMemo(() => flatten(tree), [tree])
  
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return
    
    const fromIndex = flat.findIndex(n => n._id === active.id)
    const toIndex = flat.findIndex(n => n._id === over.id)
    
    if (fromIndex === -1 || toIndex === -1) return

    const activeNode = flat[fromIndex]
    const overNode = flat[toIndex]
    
    // Prevent moving an album into its own descendant
    const isDescendant = (parentId: string, childId: string): boolean => {
      const child = flat.find(n => n._id === childId)
      if (!child) return false
      if (child.parentAlbumId === parentId) return true
      if (!child.parentAlbumId) return false
      return isDescendant(parentId, child.parentAlbumId)
    }
    
    if (isDescendant(activeNode._id, overNode._id)) {
      console.warn('Cannot move album into its own descendant')
      return
    }

    const updates: Array<{ id: string; parentAlbumId: string | null; order: number }> = []
    
    // Same parent: reorder within siblings
    if ((activeNode.parentAlbumId ?? null) === (overNode.parentAlbumId ?? null)) {
      const siblings = localAlbums
        .filter(a => (a.parentAlbumId ?? null) === (activeNode.parentAlbumId ?? null))
        .sort((a,b) => (a.order - b.order) || a.name.localeCompare(b.name))
      const ids = siblings.map(s => s._id)
      const from = ids.indexOf(activeNode._id)
      const to = ids.indexOf(overNode._id)
      if (from === -1 || to === -1) return
      const newIds = arrayMove(ids, from, to)
      updates.push(...newIds.map((id, idx) => ({ 
        id, 
        parentAlbumId: activeNode.parentAlbumId ?? null, 
        order: idx 
      })))
    } else {
      // Different parent: move to new parent and reorder
      const newParentId = overNode.parentAlbumId ?? null
      
      // Get all siblings in the new parent (including the dragged item)
      const newSiblings = localAlbums
        .filter(a => (a.parentAlbumId ?? null) === newParentId && a._id !== activeNode._id)
        .sort((a,b) => (a.order - b.order) || a.name.localeCompare(b.name))
      
      // Find the position where we're inserting
      const overIndex = newSiblings.findIndex(s => s._id === overNode._id)
      const insertIndex = overIndex >= 0 ? overIndex : newSiblings.length
      
      // Create new order: insert dragged item at the target position
      const newOrder = [...newSiblings]
      newOrder.splice(insertIndex, 0, activeNode as any)
      
      // Update all affected albums
      // 1. Update the moved album's parent and order
      updates.push({
        id: activeNode._id,
        parentAlbumId: newParentId,
        order: insertIndex
      })
      
      // 2. Update order of siblings after insertion point
      newOrder.forEach((album, idx) => {
        if (album._id !== activeNode._id) {
          updates.push({
            id: album._id,
            parentAlbumId: newParentId,
            order: idx
          })
        }
      })
      
      // 3. Reorder siblings in the old parent
      const oldSiblings = localAlbums
        .filter(a => (a.parentAlbumId ?? null) === (activeNode.parentAlbumId ?? null) && a._id !== activeNode._id)
        .sort((a,b) => (a.order - b.order) || a.name.localeCompare(b.name))
      
      oldSiblings.forEach((album, idx) => {
        updates.push({
          id: album._id,
          parentAlbumId: activeNode.parentAlbumId ?? null,
          order: idx
        })
      })
    }
    
    if (updates.length === 0) return
    
    // Optimistically update local state immediately
    setLocalAlbums(prev => {
      const updated = prev.map(a => {
        const u = updates.find(x => x.id === a._id)
        if (u) {
          return { 
            ...a, 
            parentAlbumId: u.parentAlbumId ?? null, 
            order: u.order 
          }
        }
        return a
      })
      return updated
    })
    
    // Save to server
    try {
      await onReorder(updates)
      // After successful reorder, refresh from server to ensure consistency
      // The parent component should handle the refresh via fetchAlbums()
    } catch (error) {
      console.error('Failed to reorder albums:', error)
      // Revert on error - reload from original albums prop
      setLocalAlbums(albums)
      throw error // Re-throw so parent can show error message
    }
  }

  const allItemIds = useMemo(() => flat.map(n => n._id), [flat])

  // Ensure expandedNodes is always a Set
  const safeExpandedNodes = expandedNodes || new Set<string>()

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="border rounded-md overflow-hidden bg-background text-foreground">
        <SortableContext items={allItemIds} strategy={verticalListSortingStrategy}>
          {tree.map(parent => (
            <TreeNode 
              key={parent._id} 
              node={parent} 
              renderActions={renderActions} 
              onOpen={onOpen}
              expandedNodes={safeExpandedNodes}
              onToggleNode={toggleNode}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  )
}

export default AlbumTree
