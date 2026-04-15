import { Tabs } from 'expo-router';
import { Dimensions, Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccessibilityProvider } from '../../components/AccessibilityContext';
import { AlertsProvider } from '../AlertsContext';

const { width } = Dimensions.get('window');

function TabIcon({ iconSource, label, focused, isAlertIcon = false }: { iconSource: any; label: string; focused: boolean; isAlertIcon?: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Image 
        source={iconSource} 
        style={[
          styles.tabIcon,
          isAlertIcon && styles.alertIcon,
          focused && styles.tabIconActive
        ]}
        resizeMode="contain"
      />
      <Text 
        style={[styles.tabLabel, focused && styles.tabLabelActive]}
        numberOfLines={2}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

export default function Layout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = Platform.OS === 'ios' ? 75 : 65;
  const bottomSafeArea = Platform.OS === 'ios' ? 15 : Math.max(8, insets.bottom);

  return (
    <AlertsProvider>
    <AccessibilityProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#EBEBEB',
              borderTopWidth: 1,
              height: tabBarHeight,
              paddingBottom: bottomSafeArea,
              paddingTop: 6,
              paddingHorizontal: 10,
            },
            tabBarShowLabel: false,
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Home',
              tabBarIcon: ({ focused }) => (
                <TabIcon 
                  iconSource={require('../../assets/images/home-icon.png')} 
                  label="Home" 
                  focused={focused} 
                />
              ),
            }}
          />
          <Tabs.Screen
            name="hazard-map"
            options={{
              title: 'Map',
              tabBarIcon: ({ focused }) => (
                <TabIcon 
                  iconSource={require('../../assets/images/hazard-map-icon.png')} 
                  label="Map" 
                  focused={focused} 
                />
              ),
            }}
          />
          <Tabs.Screen
            name="alerts"
            options={{
              title: 'Alerts',
              tabBarIcon: ({ focused }) => (
                <TabIcon 
                  iconSource={require('../../assets/images/siren1.png')} 
                  label="Alerts" 
                  focused={focused}
                  isAlertIcon={true}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="prep-guide"
            options={{
              title: 'Guide',
              tabBarIcon: ({ focused }) => (
                <TabIcon 
                  iconSource={require('../../assets/images/guide-icon.png')} 
                  label="Guide" 
                  focused={focused} 
                />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ focused }) => (
                <TabIcon 
                  iconSource={require('../../assets/images/profile-icon.png')} 
                  label="Profile" 
                  focused={focused} 
                />
              ),
            }}
          />
        </Tabs>
        {/* Bottom spacer for Android to prevent content from going behind nav bar */}
        {Platform.OS === 'android' && insets.bottom > 0 && (
          <View style={{ height: insets.bottom * 0.5, backgroundColor: '#FFFFFF' }} />
        )}
      </View>
    </AccessibilityProvider>
    </AlertsProvider>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    width: '100%',
    flex: 1,
    paddingHorizontal: 3,
    paddingVertical: 2,
    gap: 1,
  },
  tabIcon: {
    width: 22,
    height: 22,
    opacity: 0.6,
  },
  alertIcon: {
    width: 35,
    height: 35,
  },
  tabIconActive: {
    opacity: 1,
    tintColor: '#D62828',
  },
  tabLabel: {
    fontSize: 8,
    color: '#717171',
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: -0.3,
    lineHeight: 10,
    maxWidth: 45,
    height: 20,
  },
  tabLabelActive: {
    color: '#D62828',
    fontWeight: '600',
  },
});