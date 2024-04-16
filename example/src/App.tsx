/**
 * Example React Native App using @csllc/rn-ble
 *
 * @format
 */

import React, {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import type {PropsWithChildren} from 'react';
import {
  AppState,
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

import {
  BleStatusStore,
  BleState,
  BlePeripheralState,
  BlePeripheralStore,
} from '@csllc/rn-mb-ble';

type SectionProps = PropsWithChildren<{
  title: string;
}>;

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const bleStatus: BleState = useSyncExternalStore(
    BleStatusStore.subscribe,
    BleStatusStore.getSnapshot,
  );

  // Watch the app state (background->foreground)
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  useEffect(() => {
    console.log('starting home screen');
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        BleStatusStore.checkState();
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
      console.log('AppState', appState.current);
    });

    return () => {
      subscription.remove();
      console.log('stopping home screen');
    };
  }, []);

  const tryToEnable = () => BleStatusStore.enable();

  // We can't activate bluetooth.  try to tell the user what to do
  function userAction() {
    console.log('useraction', bleStatus);
    if (!bleStatus.isReady) {
      return <Text style={styles.text}>Initializing Bluetooth...</Text>;
    }
    if (!bleStatus.isAvailable) {
      return (
        <Text style={styles.text}>
          Bluetooth is not available on this device
        </Text>
      );
    }
    if (!bleStatus.isAuthorized) {
      return (
        <Text style={styles.text}>
          Open your device settings to allow this app to access Bluetooth
        </Text>
      );
    }
    if (!bleStatus.isEnabled) {
      return (
        <Text style={styles.text}>
          Bluetooth is not enabled.
          {Platform.OS === 'android' && (
            <Button title="Enable" onPress={tryToEnable} />
          )}
        </Text>
      );
    }
    return null;
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Text style={[styles.sectionTitle]}>@csllc/rn-ble Example</Text>

          {userAction()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 10,
  },

  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
