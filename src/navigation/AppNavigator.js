import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import MainScreen from '../screens/MainScreen';
import SignupScreen from '../screens/SignupScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainScreen} options={{ title: '홈' }} />
        <Stack.Screen name="Signup" component={SignupScreen} options={{ title: '회원가입' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
