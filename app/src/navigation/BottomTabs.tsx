import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { Screen1 } from '../screens/Screen1';
import { Screen2 } from '../screens/Screen2';
import { Screen3 } from '../screens/Screen3';
import { Routes } from './routes';
import type { TabParamList } from './routes';

const Tab = createBottomTabNavigator<TabParamList>();

/** Bottom tabs rendered with the custom floating pill bar. */
export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name={Routes.Screen1} component={Screen1} options={{ title: 'Screen 1' }} />
      <Tab.Screen name={Routes.Screen2} component={Screen2} options={{ title: 'Screen 2' }} />
      <Tab.Screen name={Routes.Screen3} component={Screen3} options={{ title: 'Screen 3' }} />
    </Tab.Navigator>
  );
}
