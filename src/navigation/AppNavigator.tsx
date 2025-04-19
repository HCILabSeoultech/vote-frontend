import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SignupStep1Screen from '../screens/SignupStep1Screen';
import SignupStep2Screen from '../screens/SignupStep2Screen';
import SignupStep3Screen from '../screens/SignupStep3Screen';

import LoginScreen from '../screens/LoginScreen';
import UserPageScreen from '../screens/UserPageScreen';
import CommentScreen from '../screens/CommentScreen';

import MainTabs from './MainTabs';
import ReuploadVoteScreen from '../screens/ReuploadVoteScreen';
import SingleVoteScreen from '../screens/SingleVoteScreen';
import { UserData } from '../types/UserData';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  SignupStep1Screen: undefined;
  SignupStep2Screen: { userData: Partial<UserData> };
  SignupStep3Screen: { userData: Partial<UserData> };
  Main: undefined;
  ReuploadVoteScreen: { voteId: number };
  SingleVoteScreen: { voteId: number };
  UserPageScreen: { userId: number };
  CommentScreen: { voteId: number };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignupStep1Screen" component={SignupStep1Screen} />
      <Stack.Screen name="SignupStep2Screen" component={SignupStep2Screen} />
      <Stack.Screen name="SignupStep3Screen" component={SignupStep3Screen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="ReuploadVoteScreen" component={ReuploadVoteScreen} />
      <Stack.Screen name="SingleVoteScreen" component={SingleVoteScreen} />
      <Stack.Screen name="UserPageScreen" component={UserPageScreen} />
      <Stack.Screen name="CommentScreen" component={CommentScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
