import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { getVoteStatisticsByAge } from '../../api/post';
import { AgeStatistics as AgeStatsType } from '../../types/Vote';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const CHART_COLORS = [
  '#FF6B6B', // 빨간색
  '#4ECDC4', // 청록색
  '#45B7D1', // 하늘색
  '#96CEB4', // 민트색
  '#FFEEAD', // 연한 노란색
  '#D4A5A5', // 분홍색
  '#9B59B6', // 보라색
  '#3498DB', // 파란색
  '#2ECC71', // 초록색
  '#F1C40F', // 노란색
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>연령별 투표 분포</Text>
      
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>참여자 현황</Text>
        <PieChart
          data={chartData}
          width={Dimensions.get('window').width - 32}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="0"
          absolute
        />
      </View>

      <View style={styles.statsContainer}>
        {datasets.map(({ age, total, details }) => (
          <View key={age} style={styles.ageSection}>
            <View style={styles.ageHeader}>
              <Text style={styles.label}>{age}대</Text>
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
          </View>
        ))}
      </View>

      <Text style={styles.aiAnalysis}>
        AI 분석 결과: {'\n\n'}
        {datasets.length === 1 ? (
          `현재 ${datasets[0].age}대만 투표에 참여했으며, 총 ${totalParticipants}명이 참여했습니다. 다른 연령대의 참여를 유도하면 더 다양한 의견을 수렴할 수 있을 것으로 예상됩니다.`
        ) : (
          `총 ${datasets.length}개 연령대가 참여했으며, 전체 ${totalParticipants}명이 투표했습니다. 
          ${datasets[0].age}대의 참여율이 가장 높았습니다(${((datasets[0].total / totalParticipants) * 100).toFixed(1)}%).`
        )}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 16,
  },
  chartContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2D3748',
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  ageSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  ageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  value: {
    fontSize: 16,
    color: '#2D3748',
  },
  optionsList: {
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  optionValue: {
    fontSize: 14,
    color: '#4A5568',
  },
  aiAnalysis: {
    margin: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
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
});

export default AgeStatistics; 