import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { colors } from '../theme/colors';

export const OfflineBanner: React.FC = () => {
  const { isOffline, checkConnection } = useNetwork();

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline" size={18} color="#fca5a5" style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.subtitle}>Showing cached view. Some actions may be unavailable.</Text>
      </View>
      <TouchableOpacity style={styles.retryButton} onPress={checkConnection} activeOpacity={0.7}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#7f1d1d',
    borderBottomWidth: 1,
    borderBottomColor: '#b91c1c',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fef2f2',
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: '#fecaca',
    fontSize: 10,
    marginTop: 1,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
