// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { Home } from './src/screen/Home';
import { Calendar } from './src/screen/Calendar';
import { Library } from './src/screen/Library';
import { MyPage } from './src/screen/MyPage';


const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();


const createStack = (ScreenComponent, screenName) => {
  return function StackNavigator() {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerLargeTitle: false,
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen 
          name={screenName + "Main"}
          component={ScreenComponent} 
          options={{ 
            headerShown: false,
            headerLargeTitle: false,
          }} 
        />
      </Stack.Navigator>    
    );
  };
};

// 메인 Tab Navigator
export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            
            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Calendar') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Library') {
              iconName = focused ? 'library' : 'library-outline';
            } else if (route.name === 'MyPage') {
              iconName = focused ? 'person' : 'person-outline';
            }
            
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
          tabBarStyle: {
            paddingBottom: 5,
            height: 60,
            marginBottom: 35,
          },
        })}
      >
        <Tab.Screen name="Home" component={createStack(Home, "Home")}options={{ title: 'Home' }}/>
        <Tab.Screen name="Calendar" component={createStack(Calendar, "Calendar")}options={{ title: 'Calendar' }}/>
        <Tab.Screen name="Library" component={createStack(Library, "Library")}options={{ title: 'Library' }}/>
        <Tab.Screen name="MyPage" component={createStack(MyPage, "MyPage")}options={{ title: 'MyPage' }}/>
      </Tab.Navigator>
    </NavigationContainer>
  );
}