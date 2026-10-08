import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import type { ProjectStatus, TaskPriority, TaskStatus } from '../lib/api';

interface BadgeProps {
  variant: ProjectStatus | TaskPriority | TaskStatus | string;
  label?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant, label }) => {
  const getConfig = () => {
    switch (variant) {
      case 'HIGH':
        return {
          text: label || 'High Priority',
          bg: colors.dangerBg,
          border: colors.dangerBorder,
          textCol: colors.danger,
        };
      case 'MEDIUM':
        return {
          text: label || 'Medium Priority',
          bg: colors.warningBg,
          border: colors.warningBorder,
          textCol: colors.warning,
        };
      case 'LOW':
        return {
          text: label || 'Low Priority',
          bg: colors.successBg,
          border: colors.successBorder,
          textCol: colors.success,
        };
      case 'COMPLETED':
        return {
          text: label || 'Completed',
          bg: colors.successBg,
          border: colors.successBorder,
          textCol: colors.success,
        };
      case 'IN_PROGRESS':
        return {
          text: label || 'In Progress',
          bg: 'rgba(99, 102, 241, 0.15)',
          border: 'rgba(99, 102, 241, 0.3)',
          textCol: colors.primaryLight,
        };
      case 'PENDING':
      case 'NOT_STARTED':
      default:
        return {
          text: label || (variant === 'NOT_STARTED' ? 'Not Started' : 'Pending'),
          bg: 'rgba(100, 116, 139, 0.15)',
          border: 'rgba(100, 116, 139, 0.3)',
          textCol: colors.textSecondary,
        };
    }
  };

  const config = getConfig();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.textCol }]} />
      <Text style={[styles.text, { color: config.textCol }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
});
