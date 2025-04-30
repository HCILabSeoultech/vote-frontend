import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Animated as RNAnimated, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { getVoteStatisticsByAge } from '../api/post';
import { AgeStatistics as AgeStatsType } from '../types/Vote';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming,
  FadeIn,
  SlideInRight
} from 'react-native-reanimated';

const CHART_COLORS = [
  '#4C51BF', // 인디고
  '#48BB78', // 그린
  '#4299E1', // 블루
  '#ED64A6', // 핑크
  '#ECC94B', // 옐로우
  '#9F7AEA', // 퍼플
  '#F56565', // 레드
  '#38B2AC', // 틸
  '#667EEA', // 라이트 인디고
  '#ED8936', // 오렌지
];

// 테스트용 목업 데이터
const mockData = {
  "20": {
    stat: {
      "찬성": 150,
      "반대": 50
    }
  },
  "30": {
    stat: {
      "찬성": 200,
      "반대": 100
    }
  },
  "40": {
    stat: {
      "찬성": 180,
      "반대": 120
    }
  },
  "50": {
    stat: {
      "찬성": 120,
      "반대": 80
    }
  }
};

interface AgeStatisticsProps {
  voteId: number;
}

const SkeletonLoader = () => {
  const opacity = useSharedValue(0.3);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>연령별 투표 분포</Text>
      
      <Animated.View style={[styles.chartContainer, animatedStyle]}>
        <View style={styles.skeletonChartTitle} />
        <View style={styles.skeletonChart} />
      </Animated.View>
      
      <View style={styles.statsContainer}>
        {[1, 2, 3, 4].map((index) => (
          <Animated.View key={index} style={[styles.ageSection, animatedStyle]}>
            <View style={styles.ageHeader}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonValue} />
            </View>
            <View style={styles.optionsList}>
              {[1, 2].map((optionIndex) => (
                <View key={optionIndex} style={styles.optionRow}>
                  <View style={styles.skeletonOptionLabel} />
                  <View style={styles.skeletonOptionValue} />
                </View>
              ))}
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[styles.aiAnalysis, animatedStyle]}>
        <View style={styles.skeletonAnalysis} />
      </Animated.View>
    </ScrollView>
  );
};

const AgeStatistics: React.FC<AgeStatisticsProps> = ({ voteId }) => {
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<AgeStatsType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAge, setSelectedAge] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      console.log('연령별 통계 요청 시작:', voteId);
      const data = await getVoteStatisticsByAge(voteId);
      
      const typedResponse = data as AgeStatsType;
      const cleanedResponse: AgeStatsType = {};
      Object.keys(typedResponse).forEach(key => {
        const cleanedKey = key.replace(/^\d+\s+/, '').trim();
        cleanedResponse[cleanedKey] = typedResponse[key];
      });
      
      setStatistics(cleanedResponse);
    } catch (error: any) {
      console.error('연령별 통계 에러 상세:', error);
      if (error.response) {
        console.error('에러 응답:', error.response.data);
        console.error('에러 상태:', error.response.status);
      }
      setError('연령별 통계를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [voteId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const datasets = useMemo(() => {
    if (!statistics) return [];
    
    const data = Object.entries(statistics).map(([age, data]) => {
      const total = Object.values(data.stat).reduce<number>((sum, count) => sum + Number(count), 0);
      return {
        age: age.replace(/[^0-9]/g, ''),
        total,
        details: data.stat
      };
    });

    return data.sort((a, b) => Number(a.age) - Number(b.age));
  }, [statistics]);

  const totalParticipants = useMemo(() => 
    datasets.reduce((sum, { total }) => sum + total, 0),
    [datasets]
  );

  const chartData = useMemo(() => 
    datasets.map(({ age, total }, index) => ({
      name: `${age}대`,
      population: total,
      color: CHART_COLORS[index % CHART_COLORS.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    })),
    [datasets]
  );

  const chartAnimation = new RNAnimated.Value(0);
  
  useEffect(() => {
    if (!loading && statistics) {
      RNAnimated.timing(chartAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, statistics]);

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error || !statistics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || '데이터를 불러올 수 없습니다.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.headerContainer}>
        <Text style={styles.title}>연령별 투표 분포</Text>
        <Text style={styles.totalParticipants}>총 참여자 {totalParticipants}명</Text>
      </Animated.View>
      
      <Animated.View 
        entering={FadeIn.delay(300).duration(800)}
        style={styles.chartContainer}
      >
        <View style={styles.chartWrapper}>
          <View style={styles.chartSection}>
            <PieChart
              data={chartData}
              width={240}
              height={200}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="20"
              absolute
              hasLegend={false}
              center={[20, 0]}
            />
          </View>

          <View style={styles.quickStatsContainer}>
            {datasets.map(({ age, total }, index) => (
              <TouchableOpacity
                key={age}
                style={[
                  styles.quickStatItem,
                  selectedAge === age && styles.selectedQuickStatItem
                ]}
                onPress={() => setSelectedAge(age === selectedAge ? null : age)}
              >
                <View style={[styles.colorIndicator, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                <Text style={styles.quickStatText}>
                  {age}대 ({total}명)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>

      <View style={styles.statsContainer}>
        {datasets.map(({ age, total, details }, index) => (
          <Animated.View
            key={age}
            entering={SlideInRight.delay(index * 100).springify()}
            style={[
              styles.ageSection,
              selectedAge === age && styles.selectedAgeSection
            ]}
          >
            <View style={styles.ageHeader}>
              <View style={styles.ageLabelContainer}>
                <Text style={styles.label}>{age}대</Text>
                <View style={[styles.colorIndicator, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
              </View>
              <Text style={styles.value}>
                {total}명 ({((total / totalParticipants) * 100).toFixed(1)}%)
              </Text>
            </View>
            <View style={styles.optionsList}>
              {Object.entries(details).map(([option, count]) => (
                <View key={option} style={styles.optionRow}>
                  <Text style={styles.optionLabel}>- {option}</Text>
                  <Text style={styles.optionValue}>
                    {count}명 ({((count / total) * 100).toFixed(1)}%)
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View
        entering={FadeIn.delay(600).duration(800)}
        style={styles.aiAnalysis}
      >
        <Text style={styles.aiAnalysisTitle}>AI 분석 결과</Text>
        <Text style={styles.aiAnalysisContent}>
          {datasets.length === 1 ? (
            `현재 ${datasets[0].age}대만 투표에 참여했으며, 총 ${totalParticipants}명이 참여했습니다. 다른 연령대의 참여를 유도하면 더 다양한 의견을 수렴할 수 있을 것으로 예상됩니다.`
          ) : (
            `총 ${datasets.length}개 연령대가 참여했으며, 전체 ${totalParticipants}명이 투표했습니다.\n${datasets[0].age}대의 참여율이 가장 높았습니다(${((datasets[0].total / totalParticipants) * 100).toFixed(1)}%).`
          )}
        </Text>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  headerLine: {
    width: 40,
    height: 3,
    backgroundColor: '#4299E1',
    marginTop: 8,
    borderRadius: 2,
  },
  errorContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  chartContainer: {
    margin: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 220,
  },
  chartWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  chartSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 0,
    marginLeft: 10,
  },
  quickStatsContainer: {
    width: 130,
    paddingRight: 16,
    justifyContent: 'center',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
  },
  selectedQuickStatItem: {
    backgroundColor: '#EBF8FF',
    borderColor: '#4299E1',
    borderWidth: 1,
  },
  quickStatText: {
    fontSize: 14,
    color: '#2D3748',
    marginLeft: 8,
    fontWeight: '500',
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 6,
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
  },
  ageSection: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  ageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  ageLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3748',
  },
  value: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  optionsList: {
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  optionLabel: {
    fontSize: 15,
    color: '#4A5568',
  },
  optionValue: {
    fontSize: 15,
    color: '#4A5568',
    fontWeight: '500',
  },
  aiAnalysis: {
    margin: 16,
    padding: 20,
    backgroundColor: '#EBF8FF',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4299E1',
  },
  aiAnalysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C5282',
    marginBottom: 8,
  },
  aiAnalysisContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#2D3748',
  },
  skeletonChartTitle: {
    height: 20,
    width: '40%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 16,
  },
  skeletonChart: {
    height: 220,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  skeletonLabel: {
    height: 20,
    width: '30%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonValue: {
    height: 20,
    width: '20%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonOptionLabel: {
    height: 16,
    width: '40%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonOptionValue: {
    height: 16,
    width: '15%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonAnalysis: {
    height: 48,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  totalParticipants: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 8,
    fontWeight: '500',
  },
  selectedAgeSection: {
    borderColor: '#4299E1',
    borderWidth: 2,
    backgroundColor: '#F7FAFC',
  },
});

export default React.memo(AgeStatistics); 