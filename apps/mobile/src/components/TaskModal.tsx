import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Input } from './Input';
import { Button } from './Button';
import type { Task, TaskPriority, TaskStatus, CreateTaskDto, UpdateTaskDto } from '../lib/api';

interface TaskModalProps {
  visible: boolean;
  projectId: string;
  task?: Task | null;
  onClose: () => void;
  onSubmit: (data: CreateTaskDto | UpdateTaskDto) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  projectId,
  task,
  onClose,
  onSubmit,
}) => {
  const isEditing = !!task;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('PENDING');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
    } else {
      setName('');
      setDescription('');
      setPriority('MEDIUM');
      setStatus('PENDING');
      setDueDate('');
    }
    setError(null);
  }, [task, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Task name is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (isEditing) {
        await onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
      } else {
        await onSubmit({
          projectId,
          name: name.trim(),
          description: description.trim() || undefined,
          priority,
          status,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
  const statusOptions: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{isEditing ? 'Edit Task' : 'New Task'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.formContent} keyboardShouldPersistTaps="handled">
            <Input
              label="Task Name *"
              placeholder="e.g. Design navigation flow"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Description"
              placeholder="Add details, requirements..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={{ height: 80, textAlignVertical: 'top' }}
            />

            {/* Priority Selection Pills */}
            <Text style={styles.sectionLabel}>PRIORITY</Text>
            <View style={styles.pillRow}>
              {priorityOptions.map((p) => {
                const selected = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[styles.pill, selected && styles.pillSelected]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status Selection Pills */}
            <Text style={styles.sectionLabel}>STATUS</Text>
            <View style={styles.pillRow}>
              {statusOptions.map((s) => {
                const selected = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[styles.pill, selected && styles.pillSelected]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                      {s.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Input
              label="Due Date (YYYY-MM-DD)"
              placeholder="2026-10-31"
              value={dueDate}
              onChangeText={setDueDate}
              helperText="Optional target deadline"
            />

            <View style={styles.btnRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={onClose}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title={isEditing ? 'Save Changes' : 'Create Task'}
                variant="primary"
                isLoading={isSubmitting}
                onPress={handleSave}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorderHighlight,
    maxHeight: '90%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.cardLight,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
  formContent: {
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardLight,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
  },
  pillSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.textPrimary,
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
  },
});
