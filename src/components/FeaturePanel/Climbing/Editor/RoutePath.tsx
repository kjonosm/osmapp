/* eslint-disable react/jsx-props-no-spreading */
import React, { useState } from 'react';
import styled from 'styled-components';
import { useClimbingContext } from '../contexts/ClimbingContext';
import { PositionPx } from '../types';
import { PathWithBorder } from './PathWithBorder';
import { MouseTrackingLine } from './MouseTrackingLine';

const InteractiveArea = styled.line`
  pointer-events: all;
`;
const AddNewPoint = styled.circle`
  pointer-events: none;
  cursor: copy;
`;

export const RoutePath = ({ route, routeNumber }) => {
  const [tempPointPosition, setTempPointPosition] = useState<
    PositionPx & { lineIndex: number }
  >({
    x: 0,
    y: 0,
    units: 'px',
    lineIndex: 0,
  });
  const {
    isPointMoving,
    isRouteSelected,
    getPixelPosition,
    getMachine,
    isEditMode,
    addOffsets,
    isLineInteractiveAreaHovered,
    setIsLineInteractiveAreaHovered,
    getPathForRoute,
  } = useClimbingContext();
  const isSelected = isRouteSelected(routeNumber);
  const machine = getMachine();
  const path = getPathForRoute(route);
  if (!path) return null;
  const pointsInString = path.map(({ x, y }, index) => {
    const position = getPixelPosition({ x, y, units: 'percentage' });

    return `${index === 0 ? 'M' : 'L'}${position.x} ${position.y} `;
  });

  const onMouseMove = (e, lineIndex: number) => {
    if (
      machine.currentStateName === 'editRoute' ||
      machine.currentStateName === 'extendRoute'
    ) {
      if (!isLineInteractiveAreaHovered) setIsLineInteractiveAreaHovered(true);

      const position = addOffsets(['editorPosition'], {
        x: e.clientX,
        y: e.clientY,
        units: 'px',
      });

      setTempPointPosition({
        ...position,
        lineIndex,
      });
    }
  };
  const onMouseEnter = () => {
    if (
      machine.currentStateName === 'editRoute' ||
      machine.currentStateName === 'extendRoute'
    ) {
      setIsLineInteractiveAreaHovered(true);
    }
  };

  const onMouseLeave = () => {
    if (
      machine.currentStateName === 'editRoute' ||
      machine.currentStateName === 'extendRoute'
    ) {
      setIsLineInteractiveAreaHovered(false);
    }
  };

  const hoveredPosition = addOffsets(['scrollOffset'], {
    x: tempPointPosition.x,
    y: tempPointPosition.y,
    units: 'px',
  });

  const onPointAdd = () => {
    machine.execute('addPointInBetween', {
      hoveredPosition,
      tempPointPosition,
    });
  };

  const onMouseDown = (e) => {
    onPointAdd();

    e.stopPropagation();
  };

  const isEditableSelectedRouteHovered =
    !isPointMoving &&
    (machine.currentStateName === 'editRoute' ||
      machine.currentStateName === 'extendRoute') &&
    isSelected &&
    isLineInteractiveAreaHovered;

  const isInteractionDisabled =
    machine.currentStateName === 'extendRoute' && !isRouteSelected(routeNumber);

  const commonProps = isEditableSelectedRouteHovered
    ? { cursor: 'copy' }
    : {
        onClick: (e) => {
          if (isInteractionDisabled) return;
          if (isEditMode) {
            machine.execute('editRoute', { routeNumber });
          } else {
            machine.execute('routeSelect', { routeNumber });
          }
          e.stopPropagation();
        },
        cursor: isInteractionDisabled ? undefined : 'pointer',
      };

  return (
    <>
      <PathWithBorder
        d={`M0 0 ${pointsInString}`}
        isSelected={isSelected}
        {...commonProps}
        // style={{ pointerEvents: arePointerEventsDisabled ? 'none' : 'all' }}
        style={{ pointerEvents: 'all' }}
        route={route}
      />

      {path.length > 1 &&
        path.map(({ x, y }, index) => {
          const position1 = getPixelPosition({ x, y, units: 'percentage' });

          if (path && index < path.length - 1 && !isInteractionDisabled) {
            const position2 = getPixelPosition({
              ...path[index + 1],
              units: 'percentage',
            });
            return (
              <InteractiveArea
                stroke="transparent"
                strokeWidth={20}
                x1={position1.x}
                y1={position1.y}
                x2={position2.x}
                y2={position2.y}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onMouseMove={(e) => onMouseMove(e, index)}
                onClick={onMouseDown}
                {...commonProps}
              />
            );
          }
          return null;
        })}
      {isEditableSelectedRouteHovered &&
        hoveredPosition.x !== 0 &&
        hoveredPosition.y !== 0 && (
          <AddNewPoint
            cx={hoveredPosition.x}
            cy={hoveredPosition.y}
            fill="white"
            stroke="rgba(0,0,0,0.3)"
            r={5}
          />
        )}
      {machine.currentStateName === 'extendRoute' &&
        !isLineInteractiveAreaHovered && (
          <MouseTrackingLine routeNumber={routeNumber} />
        )}
    </>
  );
};
