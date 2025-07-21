import React from 'react';
import { useConnection, type ConnectionLineComponentProps } from '@xyflow/react';

export default function ConnectionLine({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) {
  const { inProgress } = useConnection();
  return (
    <g>
      <path
        fill="none"
        stroke={inProgress ? "gray" : "blue" }
        strokeWidth={1.5}
        className="animated"
        d={`M${fromX},${fromY} C ${fromX} ${toY} ${fromX} ${toY} ${toX},${toY}`}
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={3}
        stroke="blue"
        strokeWidth={1.5}
      />
    </g>
  );
};
