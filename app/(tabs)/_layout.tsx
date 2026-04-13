import { Tabs } from 'expo-router';
import { Dimensions, Image, Platform, StyleSheet, View } from 'react-native';
import { AccessibilityProvider } from '../../components/AccessibilityContext';

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
    </View>
  );
}

export default function Layout() {
  return (
    <AccessibilityProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#EBEBEB',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 75 : 65,
            paddingBottom: Platform.OS === 'ios' ? 15 : 8,
            paddingTop: Platform.OS === 'ios' ? 10 : 8,
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
    </AccessibilityProvider>
  );
};

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    width: '100%',
    paddingHorizontal: 4,
  },
  tabIcon: {
    width: 22,
    height: 22,
    opacity: 0.6,
    marginBottom: 4,
  },
  alertIcon: {
    width: 35,
    height: 35,
    marginBottom: 2,
  },
  tabIconActive: {
    opacity: 1,
    tintColor: '#D62828',
  },
  tabLabel: {
    fontSize: 10,
    color: '#717171',
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: '#D62828',
    fontWeight: '600',
  },
});