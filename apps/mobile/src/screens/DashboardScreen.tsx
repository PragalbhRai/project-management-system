import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { OfflineBanner } from '../components/OfflineBanner';
import { apiClient, getErrorMessage, type DashboardResponseDto } from '../lib/api';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.dashboard.get();
      setStats(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const completionRate =
    stats && stats.totalTasks > 0
      ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
      : 0;

  return (
    <View style={styles.container}>
      <OfflineBanner />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.fullName || 'User'}</Text>
          <Text style={styles.headerSubtitle}>Workspace Performance Metrics</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching real-time metrics...</Text>
          </View>
        ) : (
          <>
            {/* Progress Card */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressTitle}>Execution Velocity</Text>
                  <Text style={styles.progressSubtitle}>Overall completed deliverables</Text>
                </View>
                <Text style={styles.progressPercent}>{completionRate}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${completionRate}%` }]} />
              </View>
            </View>

            {/* KPI Grid */}
            <Text style={styles.sectionTitle}>KEY METRICS</Text>
            <View style={styles.grid}>
              {/* Total Projects */}
              <TouchableOpacity
                style={styles.kpiCard}
                onPress={() => navigation.navigate('Projects')}
                activeOpacity={0.8}
              >
                <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Ionicons name="folder-outline" size={20} color={colors.primaryLight} />
                </View>
                <Text style={styles.kpiValue}>{stats?.totalProjects ?? 0}</Text>
                <Text style={styles.kpiLabel}>Total Projects</Text>
              </TouchableOpacity>

              {/* Projects in Progress */}
              <TouchableOpacity
                style={styles.kpiCard}
                onPress={() => navigation.navigate('Projects')}
                activeOpacity={0.8}
              >
                <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="play-outline" size={20} color={colors.warning} />
                </View>
                <Text style={styles.kpiValue}>{stats?.projectsInProgress ?? 0}</Text>
                <Text style={styles.kpiLabel}>In Progress</Text>
              </TouchableOpacity>

              {/* Total Tasks */}
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="list-outline" size={20} color={colors.accent} />
                </View>
                <Text style={styles.kpiValue}>{stats?.totalTasks ?? 0}</Text>
                <Text style={styles.kpiLabel}>Total Tasks</Text>
              </View>

              {/* Completed Tasks */}
              <View style={styles.kpiCard}>
                <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                </View>
                <Text style={styles.kpiValue}>{stats?.completedTasks ?? 0}</Text>
                <Text style={styles.kpiLabel}>Completed Tasks</Text>
              </View>

              {/* Pending Tasks */}
              <View style={[styles.kpiCard, { width: '100%' }]}>
                <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Ionicons name="time-outline" size={20} color="#c084fc" />
                </View>
                <Text style={styles.kpiValue}>{stats?.pendingTasks ?? 0}</Text>
                <Text style={styles.kpiLabel}>Pending Work Items</Text>
              </View>
            </View>

            {/* Quick Action Link */}
            <TouchableOpacity
              style={styles.actionBanner}
              onPress={() => navigation.navigate('Projects')}
              activeOpacity={0.8}
            >
              <View style={styles.actionBannerLeft}>
                <Ionicons name="briefcase-outline" size={22} color={colors.primaryLight} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.actionBannerTitle}>Browse Projects</Text>
                  <Text style={styles.actionBannerSubtitle}>Open projects and manage deliverables</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 13,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.cardLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 20,
  },
  actionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionBannerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
