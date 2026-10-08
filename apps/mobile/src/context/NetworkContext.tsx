import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  isOffline: boolean;
  checkConnection: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  isOffline: false,
  checkConnection: async () => {},
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [netState, setNetState] = useState<{
    isConnected: boolean;
    isInternetReachable: boolean | null;
  }>({
    isConnected: true,
    isInternetReachable: true,
  });

  const checkConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      setNetState({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Initial fetch
    checkConnection();

    // Subscribe to network updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetState({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Offline if not connected or internet is explicitly unreachable
  const isOffline = !netState.isConnected || netState.isInternetReachable === false;

  return (
    <NetworkContext.Provider
      value={{
        isConnected: netState.isConnected,
        isInternetReachable: netState.isInternetReachable,
        isOffline,
        checkConnection,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
