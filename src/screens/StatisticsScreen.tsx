import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { Tab, TabView } from '@rneui/themed';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import GenderStatistics from '../components/GenderStatistics';
import AgeStatistics from '../components/AgeStatistics';
import RegionStatistics from '../components/RegionStatistics';
import { Feather } from '@expo/vector-icons';

type StatisticsScreenRouteProp = RouteProp<RootStackParamList, 'Statistics'>;

const StatisticsScreen = () => {
  const route = useRoute<StatisticsScreenRouteProp>();
  const navigation = useNavigation();
  const { voteId } = route.params;
  const [index, setIndex] = useState(0);

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>투표 통계</Text>
        <View style={styles.headerRight} />
      </View>

      <Tab
        value={index}
        onChange={setIndex}
        indicatorStyle={styles.indicator}
        variant="primary"
      >
        <Tab.Item title="성별 분석" titleStyle={styles.tabTitle} />
        <Tab.Item title="연령별 분석" titleStyle={styles.tabTitle} />
        <Tab.Item title="지역별 분석" titleStyle={styles.tabTitle} />
      </Tab>

      <TabView value={index} onChange={setIndex} animationType="spring">
        <TabView.Item style={styles.tabContent}>
          <GenderStatistics voteId={voteId} />
        </TabView.Item>
        <TabView.Item style={styles.tabContent}>
          <AgeStatistics voteId={voteId} />
        </TabView.Item>
        <TabView.Item style={styles.tabContent}>
          <RegionStatistics voteId={voteId} />
        </TabView.Item>
      </TabView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  headerRight: {
    width: 32,
  },
  indicator: {
    backgroundColor: '#2089dc',
    height: 3,
  },
  tabTitle: {
    fontSize: 14,
    color: '#000',
  },
  tabContent: {
    width: '100%',
  },
});

export default StatisticsScreen; 