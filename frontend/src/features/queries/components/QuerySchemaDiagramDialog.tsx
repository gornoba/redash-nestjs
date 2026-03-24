'use client';

import dagre from '@dagrejs/dagre';
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  Position,
} from '@xyflow/react';
import TableOutlined from '@ant-design/icons/TableOutlined';
import '@xyflow/react/dist/style.css';
import { useMemo, useState } from 'react';

import type {
  DataSourceSchemaColumn,
  DataSourceSchemaRelation,
  DataSourceSchemaResponse,
  DataSourceSchemaTable,
} from '@/features/data-sources/types';

interface QuerySchemaDiagramDialogProps {
  dataSourceName: string;
  onClose: () => void;
  open: boolean;
  schemaResponse: DataSourceSchemaResponse | null;
}

interface TableNodeData extends Record<string, unknown> {
  columns: DataSourceSchemaColumn[];
  highlightedColumnKeys: string[];
  onColumnSelect: (
    tableName: string,
    column: DataSourceSchemaColumn,
  ) => void;
  tableComment: string | null;
  tableName: string;
}

interface RelationEdgeData extends Record<string, unknown> {
  active: boolean;
}

const NODE_WIDTH = 440;
const HEADER_HEIGHT = 42;
const ROW_HEIGHT = 30;
const NODE_PADDING = 16;

function makeColumnKey(tableName: string, columnName: string) {
  return `${tableName}::${columnName}`;
}

function getCardinalityLabel(cardinality: 'many' | 'one') {
  return cardinality === 'one' ? '1' : 'N';
}

function getColumnTypeGlyph(columnType: string | null) {
  const normalizedType = columnType?.toLowerCase() ?? '';

  if (
    normalizedType.includes('int') ||
    normalizedType.includes('numeric') ||
    normalizedType.includes('decimal') ||
    normalizedType.includes('float') ||
    normalizedType.includes('double')
  ) {
    return '123';
  }

  if (normalizedType.includes('date') || normalizedType.includes('time')) {
    return 'O';
  }

  if (
    normalizedType.includes('bool') ||
    normalizedType.includes('bit')
  ) {
    return '[]';
  }

  return 'AZ';
}

function getNodeHeight(table: DataSourceSchemaTable) {
  return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + NODE_PADDING;
}

function TableNode({
  data,
}: NodeProps<Node<TableNodeData>>) {
  return (
    <div className="w-[440px] overflow-hidden border border-[#0a84ff] bg-[#2f2f2f] text-[#d9d9d9] shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
      <div className="border-b border-[#0a84ff] bg-[#1f1f1f] px-4 py-2 text-center">
        <div className="flex items-center justify-center gap-2 text-[15px] leading-5 text-white">
          <TableOutlined className="text-[12px] text-[#4ea5ff]" />
          <span className="truncate">{data.tableName}</span>
        </div>
        {data.tableComment ? (
          <div className="truncate text-[12px] text-white/75">
            {data.tableComment}
          </div>
        ) : null}
      </div>

      <div>
        {data.columns.map((column) => {
          const columnKey = makeColumnKey(data.tableName, column.name);
          const isHighlighted = data.highlightedColumnKeys.includes(columnKey);
          const isInteractive = column.is_foreign_key || column.is_primary_key;

          return (
            <button
              key={columnKey}
              className={`relative flex h-[30px] w-full items-center gap-2 border-t border-[#0a84ff] px-4 text-left text-[12px] transition ${
                isHighlighted
                  ? 'bg-[#4f8f1d] text-white'
                  : 'bg-transparent text-[#d7d7d7] hover:bg-[#384147]'
              } ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
              onClick={() => {
                if (!isInteractive) {
                  return;
                }

                data.onColumnSelect(data.tableName, column);
              }}
              type="button"
            >
              <Handle
                id={`target:${column.name}`}
                isConnectable={false}
                position={Position.Left}
                style={{
                  background: isHighlighted ? '#9ff46b' : '#0a84ff',
                  border: '1px solid #0a84ff',
                  borderRadius: 0,
                  height: 8,
                  left: -5,
                  width: 8,
                }}
                type="target"
              />
              <Handle
                id={`source:${column.name}`}
                isConnectable={false}
                position={Position.Right}
                style={{
                  background: isHighlighted ? '#9ff46b' : '#0a84ff',
                  border: '1px solid #0a84ff',
                  borderRadius: 0,
                  height: 8,
                  right: -5,
                  width: 8,
                }}
                type="source"
              />

              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 text-[10px] text-[#4ea5ff]">
                  {getColumnTypeGlyph(column.type)}
                </span>
                {column.is_primary_key ? (
                  <span className="shrink-0 rounded bg-[#0a84ff]/20 px-1 py-[1px] text-[9px] font-semibold text-[#90c8ff]">
                    PK
                  </span>
                ) : null}
                {column.is_foreign_key ? (
                  <span className="shrink-0 rounded bg-[#0a84ff]/20 px-1 py-[1px] text-[9px] font-semibold text-[#90c8ff]">
                    FK
                  </span>
                ) : null}
                <span className="truncate">
                  {column.name}
                  {column.comment ? ` - ${column.comment}` : ''}
                </span>
              </div>

              <span className="shrink-0 pl-3 text-right text-[11px] text-white/75">
                {column.type ?? ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RelationEdge({
  data,
  id,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<Edge<RelationEdgeData>>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 18,
    offset: 22,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: data?.active ? '#5dbd1f' : '#0a84ff',
        strokeDasharray: data?.active ? '5 4' : undefined,
        strokeWidth: data?.active ? 2.4 : 1.4,
      }}
    />
  );
}

function buildGraph(
  schema: DataSourceSchemaTable[],
  relations: DataSourceSchemaRelation[],
  highlightedColumnKeys: string[],
  onColumnSelect: (tableName: string, column: DataSourceSchemaColumn) => void,
  selectedRelationIds: string[],
) {
  const graph = new dagre.graphlib.Graph({ multigraph: true });
  graph.setGraph({
    rankdir: 'LR',
    ranksep: 180,
    nodesep: 90,
    edgesep: 60,
    marginx: 40,
    marginy: 40,
  });
  graph.setDefaultEdgeLabel(() => ({}));

  const nodeIds = new Set(schema.map((table) => table.name));
  const selectedRelationIdSet = new Set(selectedRelationIds);

  schema.forEach((table) => {
    graph.setNode(table.name, {
      width: NODE_WIDTH,
      height: getNodeHeight(table),
    });
  });

  relations.forEach((relation) => {
    if (!nodeIds.has(relation.source_table) || !nodeIds.has(relation.target_table)) {
      return;
    }

    graph.setEdge(
      relation.source_table,
      relation.target_table,
      { weight: relation.target_cardinality === 'one' ? 3 : 1 },
      relation.id,
    );
  });

  dagre.layout(graph);

  const nodes: Node<TableNodeData>[] = schema.map((table) => {
    const layoutNode = graph.node(table.name) ?? {
      x: NODE_WIDTH / 2,
      y: getNodeHeight(table) / 2,
    };

    return {
      id: table.name,
      type: 'table',
      position: {
        x: layoutNode.x - NODE_WIDTH / 2,
        y: layoutNode.y - getNodeHeight(table) / 2,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        columns: table.columns,
        highlightedColumnKeys,
        onColumnSelect,
        tableComment: table.comment,
        tableName: table.name,
      },
    };
  });

  const edges: Edge<RelationEdgeData>[] = relations
    .filter(
      (relation) =>
        nodeIds.has(relation.source_table) && nodeIds.has(relation.target_table),
    )
    .map((relation) => ({
      id: relation.id,
      source: relation.source_table,
      sourceHandle: `source:${relation.source_column}`,
      target: relation.target_table,
      targetHandle: `target:${relation.target_column}`,
      type: 'relation',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 12,
        height: 12,
        color: selectedRelationIdSet.has(relation.id) ? '#5dbd1f' : '#0a84ff',
      },
      data: {
        active: selectedRelationIdSet.has(relation.id),
      },
      label: `${getCardinalityLabel(relation.source_cardinality)}:${getCardinalityLabel(
        relation.target_cardinality,
      )}`,
      labelStyle: {
        fill: '#d7d7d7',
        fontSize: 11,
      },
      style: {
        stroke: selectedRelationIdSet.has(relation.id) ? '#5dbd1f' : '#0a84ff',
        strokeDasharray: selectedRelationIdSet.has(relation.id) ? '5 4' : undefined,
        strokeWidth: selectedRelationIdSet.has(relation.id) ? 2.4 : 1.4,
      },
    }));

  return { edges, nodes };
}

export default function QuerySchemaDiagramDialog({
  dataSourceName,
  onClose,
  open,
  schemaResponse,
}: QuerySchemaDiagramDialogProps) {
  const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);
  const relations = useMemo(() => schemaResponse?.relations ?? [], [schemaResponse]);

  const highlightedColumnKeys = useMemo(() => {
    const selectedRelationIdSet = new Set(selectedRelationIds);
    const nextKeys = new Set<string>();

    relations.forEach((relation) => {
      if (!selectedRelationIdSet.has(relation.id)) {
        return;
      }

      nextKeys.add(makeColumnKey(relation.source_table, relation.source_column));
      nextKeys.add(makeColumnKey(relation.target_table, relation.target_column));
    });

    return Array.from(nextKeys);
  }, [relations, selectedRelationIds]);

  const graph = useMemo(
    () =>
      buildGraph(
        schemaResponse?.schema ?? [],
        relations,
        highlightedColumnKeys,
        (tableName, column) => {
          const relationIds = relations
            .filter((relation) => {
              const isSourceMatch =
                column.is_foreign_key &&
                relation.source_table === tableName &&
                relation.source_column === column.name;
              const isTargetMatch =
                column.is_primary_key &&
                relation.target_table === tableName &&
                relation.target_column === column.name;

              return isSourceMatch || isTargetMatch;
            })
            .map((relation) => relation.id);

          setSelectedRelationIds(relationIds);
        },
        selectedRelationIds,
      ),
    [highlightedColumnKeys, relations, schemaResponse?.schema, selectedRelationIds],
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/55 px-4 py-6">
      <div className="flex h-[88vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-[3px] bg-[#262626] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-white">
          <div>
            <div className="text-[15px] font-medium">Schema Diagram</div>
            <div className="text-[12px] text-white/60">{dataSourceName}</div>
          </div>
          <button
            className="inline-flex h-8 items-center justify-center rounded border border-white/15 px-3 text-[13px] text-white/75 transition hover:border-white/30 hover:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <ReactFlow
            defaultViewport={{ x: 32, y: 24, zoom: 0.65 }}
            edgeTypes={{ relation: RelationEdge }}
            edges={graph.edges}
            fitView={selectedRelationIds.length === 0}
            fitViewOptions={{ padding: 0.08 }}
            minZoom={0.15}
            nodes={graph.nodes}
            nodeTypes={{ table: TableNode }}
            onEdgeClick={(_, edge) => setSelectedRelationIds([edge.id])}
            onPaneClick={() => setSelectedRelationIds([])}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#3f3f3f" gap={20} size={1} />
            <Controls
              position="bottom-right"
              showInteractive={false}
              style={{ backgroundColor: '#1f1f1f', borderColor: '#3f3f3f' }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
