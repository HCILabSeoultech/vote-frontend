import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import UserPageScreen from '../screens/UserPageScreen';

import CategorySelectionScreen from '../screens/CategorySelectionScreen';
import { UserData } from '../types/UserData'
import MainTabs from './MainTabs'
import CommentScreen from '../screens/CommentScreen'; 
import ReuploadVoteScreen from '../screens/ReuploadVoteScreen'; 
import SingleVoteScreen from '../screens/SingleVoteScreen'; 



export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  CategorySelection: { userData: UserData };
  Main: undefined;
  CommentScreen: { voteId: number };
  ReuploadVoteScreen: { voteId: number };
  SingleVoteScreen: { voteId: number };
  UserPageScreen: { userId: number };
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator 
      initialRouteName="Login"
      screenOptions={{ headerShown: false }}>        
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="CommentScreen" component={CommentScreen} />
      <Stack.Screen name="ReuploadVoteScreen" component={ReuploadVoteScreen} />
      <Stack.Screen name="UserPageScreen" component={UserPageScreen} />
      <Stack.Screen name="SingleVoteScreen" component={SingleVoteScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;