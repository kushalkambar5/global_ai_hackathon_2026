import React, { useState, useEffect } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  initialize,
  getSdkStatus,
  requestPermission,
  readRecords,
  insertRecords,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './LoginScreen';

const API_BASE = 'https://daringly-openchain-caden.ngrok-free.dev';

// Permissions list mapping to the 14 data types requested
const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'write', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'write', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'write', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'write', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'write', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'Height' },
  { accessType: 'read', recordType: 'Hydration' },
  { accessType: 'read', recordType: 'Nutrition' },
  { accessType: 'read', recordType: 'MenstruationFlow' },
  { accessType: 'read', recordType: 'OvulationTest' },
  { accessType: 'read', recordType: 'BloodGlucose' },
  { accessType: 'read', recordType: 'BloodPressure' },
] as const;

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

function App() {
  // ─── Auth state ───────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // ─── Health Connect state ─────────────────────────────────────────────────
  const [sdkStatus, setSdkStatus] = useState<string>('Checking...');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [fetchedData, setFetchedData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // ─── Write input state ────────────────────────────────────────────────────
  const [heartRateInput, setHeartRateInput] = useState<string>('72');
  const [bloodOxygenInput, setBloodOxygenInput] = useState<string>('98');
  const [stepsInput, setStepsInput] = useState<string>('2500');
  const [sleepDurationInput, setSleepDurationInput] = useState<string>('8');
  const [caloriesInput, setCaloriesInput] = useState<string>('300');
  const [distanceInput, setDistanceInput] = useState<string>('3.5');
  const [writeLoading, setWriteLoading] = useState<string | null>(null);

  // ─── Restore session on startup ───────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem('auth_token');
        const userStr = await AsyncStorage.getItem('auth_user');
        if (token && userStr) {
          const user: User = JSON.parse(userStr);
          setAuthToken(token);
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch (e) {
        // Session restore failed — show login
      } finally {
        setAuthLoading(false);
      }
    };
    restoreSession();
  }, []);

  // ─── Health Connect init after login ──────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      checkSdkAndInit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ─── Auth Handlers ────────────────────────────────────────────────────────
  const handleLoginSuccess = (token: string, user: User) => {
    setAuthToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('auth_user');
          setAuthToken(null);
          setCurrentUser(null);
          setIsAuthenticated(false);
          setFetchedData({});
          setLogs([]);
          setIsInitialized(false);
        },
      },
    ]);
  };

  // ─── Logging ──────────────────────────────────────────────────────────────
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // ─── Health Connect helpers ───────────────────────────────────────────────
  const getAllTimeRange = () => {
    const endTime = new Date();
    const startTime = new Date('2000-01-01T00:00:00.000Z');
    return {
      operator: 'between' as const,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  };

  const checkSdkAndInit = async () => {
    try {
      const status = await getSdkStatus();
      let statusStr = 'Unknown';
      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
        statusStr = 'AVAILABLE';
      } else if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
        statusStr = 'UNAVAILABLE';
      } else if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        statusStr = 'PROVIDER UPDATE REQUIRED';
      }

      setSdkStatus(statusStr);
      addLog(`SDK Status: ${statusStr}`);

      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
        const initResult = await initialize();
        setIsInitialized(initResult);
        addLog(`Health Connect client initialized: ${initResult}`);
      } else {
        addLog('Health Connect SDK is not available on this device.');
      }
    } catch (error: any) {
      addLog(`SDK Init Error: ${error.message}`);
    }
  };

  const requestHealthPermissions = async () => {
    try {
      addLog('Requesting health permissions...');
      const granted = await requestPermission(PERMISSIONS as any);
      addLog(`Permissions granted list: ${JSON.stringify(granted)}`);
      Alert.alert('Permissions Checked', 'Check logs for details on granted permissions.');
    } catch (error: any) {
      addLog(`Permission Error: ${error.message}`);
      Alert.alert('Permission Error', error.message);
    }
  };

  const writeHeartRate = async () => {
    const bpm = parseInt(heartRateInput, 10);
    if (isNaN(bpm) || bpm <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid heart rate (bpm).');
      return;
    }
    setWriteLoading('heartRate');
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - 60000);
      const result = await insertRecords([
        {
          recordType: 'HeartRate',
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          samples: [{ time: now.toISOString(), beatsPerMinute: bpm }],
        },
      ]);
      addLog(`HeartRate inserted: ${JSON.stringify(result)}`);
      Alert.alert('Success', `Heart rate (${bpm} bpm) written!`);
    } catch (error: any) {
      addLog(`Error inserting HeartRate: ${error.message}`);
      Alert.alert('Insert Error', error.message);
    } finally {
      setWriteLoading(null);
    }
  };

  const writeBloodOxygen = async () => {
    const spo2 = parseFloat(bloodOxygenInput);
    if (isNaN(spo2) || spo2 < 0 || spo2 > 100) {
      Alert.alert('Invalid Input', 'Please enter a valid SpO2 percentage (0-100).');
      return;
    }
    setWriteLoading('bloodOxygen');
    try {
      const result = await insertRecords([
        {
          recordType: 'OxygenSaturation',
          time: new Date().toISOString(),
          percentage: spo2,
        },
      ]);
      addLog(`OxygenSaturation inserted: ${JSON.stringify(result)}`);
      Alert.alert('Success', `Blood oxygen (${spo2}%) written!`);
    } catch (error: any) {
      addLog(`Error inserting OxygenSaturation: ${error.message}`);
      Alert.alert('Insert Error', error.message);
    } finally {
      setWriteLoading(null);
    }
  };

  const writeSteps = async () => {
    const count = parseInt(stepsInput, 10);
    if (isNaN(count) || count <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid step count.');
      return;
    }
    setWriteLoading('steps');
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 60 * 1000);
      const result = await insertRecords([
        {
          recordType: 'Steps',
          count,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      ]);
      addLog(`Steps inserted: ${JSON.stringify(result)}`);
      Alert.alert('Success', `${count} steps written!`);
    } catch (error: any) {
      addLog(`Error inserting Steps: ${error.message}`);
      Alert.alert('Insert Error', error.message);
    } finally {
      setWriteLoading(null);
    }
  };

  const writeSleepDuration = async () => {
    const hours = parseFloat(sleepDurationInput);
    if (isNaN(hours) || hours <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid sleep duration in hours.');
      return;
    }
    setWriteLoading('sleep');
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);
      const result = await insertRecords([
        {
          recordType: 'SleepSession',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      ]);
      addLog(`SleepSession inserted: ${JSON.stringify(result)}`);
      Alert.alert('Success', `Sleep session (${hours} hrs) written!`);
    } catch (error: any) {
      addLog(`Error inserting SleepSession: ${error.message}`);
      Alert.alert('Insert Error', error.message);
    } finally {
      setWriteLoading(null);
    }
  };

  const writeCaloriesBurned = async () => {
    const kcal = parseFloat(caloriesInput);
    if (isNaN(kcal) || kcal <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid calorie amount.');
      return;
    }
    setWriteLoading('calories');
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 60 * 1000);
      const result = await insertRecords([
        {
          recordType: 'ActiveCaloriesBurned',
          energy: { value: kcal, unit: 'kilocalories' },
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      ]);
      addLog(`ActiveCaloriesBurned inserted: ${JSON.stringify(result)}`);
      Alert.alert('Success', `${kcal} kcal burned written!`);
    } catch (error: any) {
      addLog(`Error inserting ActiveCaloriesBurned: ${error.message}`);
      Alert.alert('Insert Error', error.message);
    } finally {
      setWriteLoading(null);
    }
  };

  const writeDistanceCovered = async () => {
    const km = parseFloat(distanceInput);
    if (isNaN(km) || km <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid distance in km.');
      return;
    }
    setWriteLoading('distance');
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 30 * 60 * 1000);
      const result = await insertRecords([
        {
          recordType: 'Distance',
          distance: { value: km * 1000, unit: 'meters' },
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      ]);
      addLog(`Distance inserted: ${JSON.stringify(result)}`);
      Alert.alert('Success', `${km} km distance written!`);
    } catch (error: any) {
      addLog(`Error inserting Distance: ${error.message}`);
      Alert.alert('Insert Error', error.message);
    } finally {
      setWriteLoading(null);
    }
  };

  const safeReadRecords = async (
    recordType: any,
    startTime: Date,
    endTime: Date,
    depth = 0
  ): Promise<any[]> => {
    if (depth > 6) {
      addLog(`Skipping corrupted interval for ${recordType}: ${startTime.toISOString()} to ${endTime.toISOString()}`);
      return [];
    }

    try {
      const res = await readRecords(recordType, {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });
      return res.records;
    } catch (err: any) {
      const errMsg = err.message || '';
      if (
        errMsg.includes('startTime must be before endTime') ||
        (errMsg.includes('startTime') && errMsg.includes('endTime'))
      ) {
        const startMs = startTime.getTime();
        const endMs = endTime.getTime();

        if (endMs - startMs <= 1000) {
          addLog(`Skipping corrupted sub-second record for ${recordType} at ${startTime.toISOString()}`);
          return [];
        }

        const midMs = Math.floor((startMs + endMs) / 2);
        const midDate = new Date(midMs);

        const leftRecords = await safeReadRecords(recordType, startTime, midDate, depth + 1);
        const rightRecords = await safeReadRecords(recordType, midDate, endTime, depth + 1);

        return [...leftRecords, ...rightRecords];
      } else {
        throw err;
      }
    }
  };

  const fetchHealthData = async () => {
    if (!isInitialized) {
      Alert.alert('Not Initialized', 'Please initialize the client first.');
      return;
    }
    setIsLoading(true);
    addLog('Fetching all historical health data...');
    const data: Record<string, any> = {};
    const range = getAllTimeRange();
    const startTime = new Date(range.startTime);
    const endTime = new Date(range.endTime);

    const recordTypesToRead = [
      'Steps',
      'Distance',
      'ActiveCaloriesBurned',
      'TotalCaloriesBurned',
      'HeartRate',
      'OxygenSaturation',
      'SleepSession',
      'Weight',
      'Height',
      'Hydration',
      'BloodGlucose',
      'BloodPressure',
      'Nutrition',
      'MenstruationFlow',
      'OvulationTest',
    ] as const;

    for (const type of recordTypesToRead) {
      try {
        const records = await safeReadRecords(type, startTime, endTime);
        data[type] = records;
        addLog(`Successfully read ${records.length} records for ${type}`);
      } catch (err: any) {
        data[type] = { error: err.message };
        addLog(`Error reading ${type}: ${err.message}`);
      }
    }

    setFetchedData(data);
    setIsLoading(false);
  };

  // ─── Sync to DB ───────────────────────────────────────────────────────────
  const syncToDatabase = async () => {
    if (Object.keys(fetchedData).length === 0) {
      Alert.alert('No Data', 'Please fetch health data first before syncing.');
      return;
    }

    setIsSyncing(true);
    addLog('Syncing health data to database...');

    try {
      const response = await fetch(`${API_BASE}/api/health/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ healthData: fetchedData }),
      });

      const result = await response.json();

      if (!response.ok) {
        addLog(`Sync failed: ${result.error}`);
        Alert.alert('Sync Failed', result.error || 'Something went wrong during sync.');
        return;
      }

      addLog(`✅ Sync successful: ${result.message}`);
      Alert.alert('Sync Complete 🎉', result.message);
    } catch (err: any) {
      addLog(`Sync error: ${err.message}`);
      Alert.alert('Sync Error', 'Could not connect to server. Check your connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  // ─── Loading screen while restoring session ───────────────────────────────
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ─── Login screen ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // ─── Main App ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Health Connect App</Text>
          <Text style={styles.headerSub}>Unified Health &amp; Fitness Data Viewer</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.userGreeting} numberOfLines={1}>
            👤 {currentUser?.fullName?.split(' ')[0] || currentUser?.email}
          </Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info Banner */}
        <View style={styles.userBanner}>
          <Text style={styles.userBannerText}>
            ✅ Signed in as <Text style={styles.userBannerEmail}>{currentUser?.email}</Text>
          </Text>
          <Text style={styles.userBannerRole}>Role: {currentUser?.role}</Text>
        </View>

        {/* Connection status section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <View style={styles.row}>
            <Text style={styles.label}>SDK Status:</Text>
            <Text style={[styles.value, sdkStatus === 'AVAILABLE' ? styles.statusOk : styles.statusErr]}>
              {sdkStatus}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Client Init:</Text>
            <Text style={[styles.value, isInitialized ? styles.statusOk : styles.statusErr]}>
              {isInitialized ? 'Yes' : 'No'}
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonSecondary} onPress={checkSdkAndInit}>
              <Text style={styles.buttonText}>Refresh Status</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.buttonPrimary} onPress={requestHealthPermissions}>
              <Text style={styles.buttonText}>Request Permissions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Write sample data section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Write Health Data</Text>
          <Text style={styles.cardSub}>Enter values and write directly to Health Connect</Text>

          {/* Heart Rate */}
          <View style={styles.writeRow}>
            <Text style={styles.writeLabel}>❤️ Heart Rate (bpm)</Text>
            <View style={styles.writeInputRow}>
              <TextInput
                style={styles.writeInput}
                value={heartRateInput}
                onChangeText={setHeartRateInput}
                keyboardType="numeric"
                placeholder="e.g. 72"
                placeholderTextColor="#555"
              />
              <TouchableOpacity
                style={[styles.buttonGreen, styles.writeButton]}
                onPress={writeHeartRate}
                disabled={writeLoading === 'heartRate'}>
                {writeLoading === 'heartRate' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Write</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Blood Oxygen */}
          <View style={styles.writeRow}>
            <Text style={styles.writeLabel}>🫁 Blood Oxygen (%)</Text>
            <View style={styles.writeInputRow}>
              <TextInput
                style={styles.writeInput}
                value={bloodOxygenInput}
                onChangeText={setBloodOxygenInput}
                keyboardType="numeric"
                placeholder="e.g. 98"
                placeholderTextColor="#555"
              />
              <TouchableOpacity
                style={[styles.buttonGreen, styles.writeButton]}
                onPress={writeBloodOxygen}
                disabled={writeLoading === 'bloodOxygen'}>
                {writeLoading === 'bloodOxygen' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Write</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Steps */}
          <View style={styles.writeRow}>
            <Text style={styles.writeLabel}>🚶 Daily Steps</Text>
            <View style={styles.writeInputRow}>
              <TextInput
                style={styles.writeInput}
                value={stepsInput}
                onChangeText={setStepsInput}
                keyboardType="numeric"
                placeholder="e.g. 2500"
                placeholderTextColor="#555"
              />
              <TouchableOpacity
                style={[styles.buttonGreen, styles.writeButton]}
                onPress={writeSteps}
                disabled={writeLoading === 'steps'}>
                {writeLoading === 'steps' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Write</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Sleep Duration */}
          <View style={styles.writeRow}>
            <Text style={styles.writeLabel}>😴 Sleep Duration (hrs)</Text>
            <View style={styles.writeInputRow}>
              <TextInput
                style={styles.writeInput}
                value={sleepDurationInput}
                onChangeText={setSleepDurationInput}
                keyboardType="numeric"
                placeholder="e.g. 8"
                placeholderTextColor="#555"
              />
              <TouchableOpacity
                style={[styles.buttonGreen, styles.writeButton]}
                onPress={writeSleepDuration}
                disabled={writeLoading === 'sleep'}>
                {writeLoading === 'sleep' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Write</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Calories Burned */}
          <View style={styles.writeRow}>
            <Text style={styles.writeLabel}>🔥 Calories Burned (kcal)</Text>
            <View style={styles.writeInputRow}>
              <TextInput
                style={styles.writeInput}
                value={caloriesInput}
                onChangeText={setCaloriesInput}
                keyboardType="numeric"
                placeholder="e.g. 300"
                placeholderTextColor="#555"
              />
              <TouchableOpacity
                style={[styles.buttonGreen, styles.writeButton]}
                onPress={writeCaloriesBurned}
                disabled={writeLoading === 'calories'}>
                {writeLoading === 'calories' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Write</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Distance Covered */}
          <View style={styles.writeRow}>
            <Text style={styles.writeLabel}>📍 Distance Covered (km)</Text>
            <View style={styles.writeInputRow}>
              <TextInput
                style={styles.writeInput}
                value={distanceInput}
                onChangeText={setDistanceInput}
                keyboardType="numeric"
                placeholder="e.g. 3.5"
                placeholderTextColor="#555"
              />
              <TouchableOpacity
                style={[styles.buttonGreen, styles.writeButton]}
                onPress={writeDistanceCovered}
                disabled={writeLoading === 'distance'}>
                {writeLoading === 'distance' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Write</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Fetch + Sync actions */}
        <TouchableOpacity style={styles.buttonFetch} onPress={fetchHealthData} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonFetchText}>📊 Fetch All Health Data</Text>
          )}
        </TouchableOpacity>

        {/* Sync to DB button — only visible when data is fetched */}
        {Object.keys(fetchedData).length > 0 && (
          <TouchableOpacity
            style={[styles.buttonSync, isSyncing && styles.buttonSyncDisabled]}
            onPress={syncToDatabase}
            disabled={isSyncing}>
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonSyncText}>☁️ Sync to Database</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Display Fetched Data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fetched Health Records</Text>
          {Object.keys(fetchedData).length === 0 ? (
            <Text style={styles.noDataText}>No data fetched yet. Tap "Fetch All Health Data" above.</Text>
          ) : (
            Object.entries(fetchedData).map(([type, records]) => {
              const isError = records && typeof records === 'object' && 'error' in records;
              const hasData = Array.isArray(records) && records.length > 0;
              return (
                <View key={type} style={styles.recordGroup}>
                  <Text style={styles.recordTypeHeader}>
                    {type} {hasData ? `(${records.length} items)` : ''}
                  </Text>
                  {isError ? (
                    <Text style={styles.errorText}>Permission denied or reading failed: {records.error}</Text>
                  ) : hasData ? (
                    <ScrollView horizontal style={styles.recordsScroll}>
                      <View style={styles.recordsContainer}>
                        <Text style={styles.jsonText}>{JSON.stringify(records, null, 2)}</Text>
                      </View>
                    </ScrollView>
                  ) : (
                    <Text style={styles.noRecordsText}>No records found for this period.</Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Log Viewer */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Console Logs</Text>
          <View style={styles.logContainer}>
            {logs.length === 0 ? (
              <Text style={styles.logText}>No logs generated.</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // ── Loading ──
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  // ── Main App ──
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b2b',
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: 140,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#a0a0a0',
    fontSize: 11,
    marginTop: 2,
  },
  userGreeting: {
    color: '#c0c0d0',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  logoutButton: {
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: '#f87171',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  logoutText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 12,
  },
  // ── User Banner ──
  userBanner: {
    backgroundColor: '#0d2b0d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a4d1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBannerText: {
    color: '#86efac',
    fontSize: 13,
    flex: 1,
  },
  userBannerEmail: {
    fontWeight: 'bold',
    color: '#4ade80',
  },
  userBannerRole: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 8,
  },
  // ── Cards ──
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2b2b2b',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardSub: {
    color: '#a0a0a0',
    fontSize: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    color: '#cccccc',
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusOk: {
    color: '#4caf50',
  },
  statusErr: {
    color: '#f44336',
  },
  // ── Buttons ──
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  buttonPrimary: {
    flex: 1,
    backgroundColor: '#2196f3',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#424242',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonGreen: {
    flex: 1,
    backgroundColor: '#2e7d32',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  // ── Write Data Rows ──
  writeRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2b2b2b',
    paddingTop: 12,
  },
  writeLabel: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  writeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  writeInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 14,
  },
  writeButton: {
    flex: 0,
    paddingHorizontal: 16,
    minWidth: 70,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  buttonFetch: {
    backgroundColor: '#6200ee',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonFetchText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSync: {
    backgroundColor: '#0ea5e9',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonSyncDisabled: {
    opacity: 0.6,
  },
  buttonSyncText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ── Records ──
  noDataText: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  recordGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b2b',
    paddingVertical: 10,
  },
  recordTypeHeader: {
    color: '#2196f3',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recordsScroll: {
    maxHeight: 180,
  },
  recordsContainer: {
    backgroundColor: '#222222',
    padding: 8,
    borderRadius: 4,
  },
  jsonText: {
    color: '#00e676',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 12,
  },
  noRecordsText: {
    color: '#777777',
    fontSize: 12,
  },
  // ── Log viewer ──
  logContainer: {
    backgroundColor: '#000000',
    padding: 8,
    borderRadius: 4,
    maxHeight: 200,
  },
  logText: {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 11,
    marginBottom: 2,
  },
});

export default App;
