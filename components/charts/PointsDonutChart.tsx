// components/charts/PointsDonutChart.tsx – Robust dynamic SVG Donut Breakdown Chart with Interactive Selection
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path, G, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";

export interface ChartSegment {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface PointsDonutChartProps {
  segments: ChartSegment[];
  totalPoints: number;
  size?: number;
  selectedId?: string | null;
  onSelectSegment?: (id: string | null) => void;
}

export const PointsDonutChart: React.FC<PointsDonutChartProps> = ({
  segments,
  totalPoints,
  size = 250,
  selectedId,
  onSelectSegment,
}) => {
  const center = size / 2;
  const radius = size * 0.35;
  const baseStrokeWidth = 20;
  const activeStrokeWidth = 25;
  const badgeRadius = radius + 26;

  const validSegments = segments.filter((s) => s.value > 0);
  const totalValue = validSegments.reduce((sum, s) => sum + s.value, 0);

  const selectedSegment = validSegments.find((s) => s.id === selectedId);

  // If 0 total or no segments, render empty ring
  if (totalValue === 0 || validSegments.length === 0) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#E8F4FA"
            strokeWidth={baseStrokeWidth}
          />
        </Svg>
        <View style={styles.centerContainer} pointerEvents="none">
          <Text style={styles.totalValueText}>0</Text>
          <Text style={styles.totalLabelText}>No points</Text>
        </View>
      </View>
    );
  }

  // Single category 100% case
  if (validSegments.length === 1) {
    const single = validSegments[0];
    const isSelected = selectedId === single.id;
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelectSegment?.(isSelected ? null : single.id);
          }}
          style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
        >
          <Svg width={size} height={size}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={single.color}
              strokeWidth={isSelected ? activeStrokeWidth : baseStrokeWidth}
            />
          </Svg>
          {/* Floating 100% badge */}
          <View
            style={[
              styles.badgeContainer,
              isSelected && styles.activeBadgeContainer,
              {
                right: 16,
                top: 24,
              },
            ]}
          >
            <Text style={[styles.badgeText, isSelected && styles.activeBadgeText]}>100%</Text>
          </View>
          <View style={styles.centerContainer} pointerEvents="none">
            <Text style={styles.totalValueText}>{totalPoints.toLocaleString()}</Text>
            <Text style={styles.totalLabelText}>{single.label}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Multi-segment calculation
  let cumulativeAngle = -90; // Start at 12 o'clock

  const arcs = validSegments.map((segment) => {
    const sliceAngle = Math.max((segment.value / totalValue) * 360, 2);
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const midRad = (((startAngle + endAngle) / 2) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;
    const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

    const badgeX = center + badgeRadius * Math.cos(midRad);
    const badgeY = center + badgeRadius * Math.sin(midRad);

    return {
      ...segment,
      pathData,
      badgeX,
      badgeY,
      isSelected: selectedId === segment.id,
    };
  });

  const displayPoints = selectedSegment ? selectedSegment.value : totalPoints;
  const displayLabel = selectedSegment
    ? `${selectedSegment.label} (${selectedSegment.percentage}%)`
    : "Total Portfolio";

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* SVG Donut Arcs */}
      <Svg width={size} height={size}>
        <G>
          {arcs.map((arc) => {
            const hasSelection = Boolean(selectedId);
            const isArcSelected = arc.isSelected;
            const strokeOpacity = hasSelection ? (isArcSelected ? 1 : 0.35) : 1;
            const currentStrokeWidth = isArcSelected ? activeStrokeWidth : baseStrokeWidth;

            return (
              <Path
                key={arc.id}
                d={arc.pathData}
                fill="none"
                stroke={arc.color}
                strokeWidth={currentStrokeWidth}
                strokeOpacity={strokeOpacity}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>

      {/* Floating Percentage Badges */}
      {arcs.map((arc) => (
        <TouchableOpacity
          key={`badge-${arc.id}`}
          activeOpacity={0.7}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelectSegment?.(arc.isSelected ? null : arc.id);
          }}
          style={[
            styles.badgeContainer,
            arc.isSelected && styles.activeBadgeContainer,
            {
              left: arc.badgeX - 22,
              top: arc.badgeY - 14,
            },
          ]}
        >
          <Text style={[styles.badgeText, arc.isSelected && styles.activeBadgeText]}>
            {arc.percentage}%
          </Text>
        </TouchableOpacity>
      ))}

      {/* Center Label & Value */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (selectedId) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelectSegment?.(null);
          }
        }}
        style={styles.centerContainer}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.totalValueText,
            selectedSegment && { color: selectedSegment.color },
          ]}
        >
          {displayPoints.toLocaleString()}
        </Text>
        <Text numberOfLines={1} style={styles.totalLabelText}>
          {displayLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 7.5,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2F2FB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#01A2FB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  activeBadgeContainer: {
    backgroundColor: "#070617",
    borderColor: "#02EFF4",
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
    shadowColor: "#02EFF4",
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  badgeText: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 11,
    color: "#070617",
  },
  activeBadgeText: {
    color: "#02EFF4",
  },
  centerContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 130,
    paddingHorizontal: 4,
  },
  totalValueText: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 22,
    color: "#070617",
    letterSpacing: -0.6,
    textAlign: "center",
  },
  totalLabelText: {
    fontFamily: "PlusJakartaSans-Medium",
    fontSize: 11.5,
    color: "#6A6A74",
    marginTop: 2,
    textAlign: "center",
  },
});
