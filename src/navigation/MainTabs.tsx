import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainScreen from '../screens/MainScreen';
import SearchScreen from '../screens/SearchScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import MyPageScreen from '../screens/MyPageScreen';
import SavedScreen from '../screens/SavedScreen';
import { TabParamList } from '../types/TabParam';

const Tab = createBottomTabNavigator<TabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="홈" component={MainScreen} />
      <Tab.Screen name="검색" component={SearchScreen} />
      <Tab.Screen name="글작성" component={CreatePostScreen} />
      <Tab.Screen name="저장고" component={SavedScreen} />
      <Tab.Screen name="마이페이지" component={MyPageScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;
