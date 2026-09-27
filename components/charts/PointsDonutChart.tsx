// components/charts/PointsDonutChart.tsx – Robust dynamic SVG Donut Breakdown Chart
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, G, Circle } from "react-native-svg";

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
}

export const PointsDonutChart: React.FC<PointsDonutChartProps> = ({
  segments,
  totalPoints,
  size = 260,
}) => {
  const center = size / 2;
  const radius = size * 0.35;
  const strokeWidth = 22;
  const badgeRadius = radius + 24;

  const validSegments = segments.filter((s) => s.value > 0);
  const totalValue = validSegments.reduce((sum, s) => sum + s.value, 0);

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
            strokeWidth={strokeWidth}
          />
        </Svg>
        <View style={styles.centerContainer} pointerEvents="none">
          <Text style={styles.totalValueText}>0</Text>
          <Text style={styles.totalLabelText}>Total</Text>
        </View>
      </View>
    );
  }

  // Single category 100% case
  if (validSegments.length === 1) {
    const single = validSegments[0];
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={single.color}
            strokeWidth={strokeWidth}
          />
        </Svg>
        {/* Floating 100% badge */}
        <View
          style={[
            styles.badgeContainer,
            {
              right: 16,
              top: 24,
            },
          ]}
        >
          <Text style={styles.badgeText}>100%</Text>
        </View>
        <View style={styles.centerContainer} pointerEvents="none">
          <Text style={styles.totalValueText}>{totalPoints.toLocaleString()}</Text>
          <Text style={styles.totalLabelText}>Total</Text>
        </View>
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
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* SVG Donut Arcs */}
      <Svg width={size} height={size}>
        <G>
          {arcs.map((arc) => (
            <Path
              key={arc.id}
              d={arc.pathData}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>

      {/* Floating Percentage Badges */}
      {arcs.map((arc) => (
        <View
          key={`badge-${arc.id}`}
          style={[
            styles.badgeContainer,
            {
              left: arc.badgeX - 20,
              top: arc.badgeY - 13,
            },
          ]}
        >
          <Text style={styles.badgeText}>{arc.percentage}%</Text>
        </View>
      ))}

      {/* Center Label & Total Value */}
      <View style={styles.centerContainer} pointerEvents="none">
        <Text style={styles.totalValueText}>
          {totalPoints.toLocaleString()}
        </Text>
        <Text style={styles.totalLabelText}>Total</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
    backgroundColor: "#E8F8FE",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4EFFB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 11.5,
    color: "#111019",
  },
  centerContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  totalValueText: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 24,
    color: "#111019",
    letterSpacing: -0.5,
  },
  totalLabelText: {
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 13,
    color: "#7E7D8A",
    marginTop: 1,
  },
});
