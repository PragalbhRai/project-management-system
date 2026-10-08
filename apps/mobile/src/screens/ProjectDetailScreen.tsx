import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Badge } from '../components/Badge';
import { OfflineBanner } from '../components/OfflineBanner';
import { TaskModal } from '../components/TaskModal';
import {
  apiClient,
  getErrorMessage,
  type Project,
  type Task,
  type TaskStatus,
  type TaskPriority,
  type CreateTaskDto,
  type UpdateTaskDto,
} from '../lib/api';

export const ProjectDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { id } = route.params;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const fetchProjectAndTasks = useCallback(async () => {
    try {
      setError(null);
      const [projData, tasksData] = await Promise.all([
        apiClient.projects.get(id),
        apiClient.projects.getTasks(id),
      ]);
      setProject(projData);
      setTasks(tasksData);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProjectAndTasks();
  }, [fetchProjectAndTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProjectAndTasks();
  };

  // Toggle Complete Quick Action
  const toggleComplete = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setCompletingTaskId(task.id);
    try {
      const updated = await apiClient.tasks.update(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err: unknown) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Delete Task
  const confirmDeleteTask = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.tasks.delete(task.id);
              setTasks((prev) => prev.filter((t) => t.id !== task.id));
            } catch (err: unknown) {
              Alert.alert('Error', getErrorMessage(err));
            }
          },
        },
      ]
    );
  };

  // Handle Create / Edit Task Submit
  const handleTaskSubmit = async (data: CreateTaskDto | UpdateTaskDto) => {
    if (selectedTask) {
      const updated = await apiClient.tasks.update(selectedTask.id, data as UpdateTaskDto);
      setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updated : t)));
    } else {
      const created = await apiClient.tasks.create(data as CreateTaskDto);
      setTasks((prev) => [created, ...prev]);
    }
  };

  const openCreateModal = () => {
    setSelectedTask(null);
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  // Filtering logic
  const filteredTasks = tasks.filter((task) => {
    if (search.trim() && !task.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'ALL' && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No date';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 'No date' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'No date';
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isCompleted = item.status === 'COMPLETED';
    const isToggling = completingTaskId === item.id;

    return (
      <View style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
        <View style={styles.taskMainRow}>
          {/* Completion Checkbox */}
          <TouchableOpacity
            style={[
              styles.checkbox,
              isCompleted && styles.checkboxChecked,
              isToggling && { opacity: 0.5 },
            ]}
            onPress={() => toggleComplete(item)}
            disabled={isToggling}
            activeOpacity={0.7}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            ) : null}
          </TouchableOpacity>

          <View style={styles.taskInfo}>
            <Text
              style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {item.description ? (
              <Text style={styles.taskDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            <View style={styles.taskMetaRow}>
              <Badge variant={item.status} />
              <Badge variant={item.priority} />
              {item.dueDate ? (
                <View style={styles.dueDateBadge}>
                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                  <Text style={styles.dueDateText}>{formatDate(item.dueDate)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.taskActions}>
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmDeleteTask(item)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerArea}>
      {/* Project Overview Card */}
      {project ? (
        <View style={styles.projectOverview}>
          <View style={styles.projectTopRow}>
            <Text style={styles.projectTitle}>{project.name}</Text>
            <Badge variant={project.status} />
          </View>
          {project.description ? (
            <Text style={styles.projectDescription}>{project.description}</Text>
          ) : null}
          <View style={styles.projectDatesRow}>
            <Ionicons name="calendar" size={13} color={colors.primaryLight} />
            <Text style={styles.projectDatesText}>
              Timeline: {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Task Controls Header */}
      <View style={styles.controlsHeader}>
        <View>
          <Text style={styles.sectionTitle}>Project Tasks</Text>
          <Text style={styles.sectionSubtitle}>
            {tasks.length} total • {tasks.filter((t) => t.status === 'COMPLETED').length} done
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addTaskBtn}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addTaskText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          placeholder="Search tasks..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>STATUS:</Text>
        <View style={styles.chipsRow}>
          {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {s.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Priority Filter Tabs */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>PRIORITY:</Text>
        <View style={styles.chipsRow}>
          {['ALL', 'LOW', 'MEDIUM', 'HIGH'].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPriorityFilter(p)}
              style={[styles.chip, priorityFilter === p && styles.chipActive]}
            >
              <Text style={[styles.chipText, priorityFilter === p && styles.chipTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <OfflineBanner />

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading project workspace...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTaskItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="checkbox-outline" size={42} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Tasks Found</Text>
              <Text style={styles.emptySubtitle}>
                {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                  ? 'No tasks matched your active filter combination.'
                  : 'Get started by creating your first task in this project.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Task Creation / Edit Modal */}
      <TaskModal
        visible={modalVisible}
        projectId={id}
        task={selectedTask}
        onClose={() => setModalVisible(false)}
        onSubmit={handleTaskSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerArea: {
    padding: 16,
    paddingBottom: 8,
  },
  projectOverview: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  projectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  projectDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  projectDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectDatesText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '500',
  },
  controlsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addTaskText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    width: 65,
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textPrimary,
  },
  listContent: {
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  taskCardCompleted: {
    opacity: 0.7,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  taskMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.cardBorderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  taskDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dueDateText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionBtn: {
    padding: 6,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    padding: 12,
    margin: 16,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
