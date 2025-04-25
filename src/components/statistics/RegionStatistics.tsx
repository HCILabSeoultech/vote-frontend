import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getVoteStatisticsByRegion } from '../../api/post';
import { RegionStatistics as RegionStatsType, StatOption } from '../../types/Vote';
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

interface Props {
  voteId: number;
}

type RegionData = {
  [key: string]: {
    stat: {
      [key: string]: number;
    };
  };
};

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
      <Text style={styles.title}>지역별 투표 분포</Text>
      
      <Animated.View style={[styles.chartContainer, animatedStyle]}>
        <View style={styles.skeletonChartTitle} />
        <View style={styles.skeletonChart} />
      </Animated.View>
      
      <View style={styles.statsContainer}>
        <View style={styles.skeletonStatsTitle} />
        {[1, 2, 3, 4, 5].map((index) => (
          <Animated.View key={index} style={[styles.regionSection, animatedStyle]}>
            <View style={styles.regionHeader}>
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

const RegionStatistics = ({ voteId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RegionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getVoteStatisticsByRegion(voteId);
      
      const typedResponse = response as RegionData;
      const cleanedResponse: RegionData = {};
      Object.keys(typedResponse).forEach(key => {
        const cleanedKey = key.replace(/^\d+\s+/, '').trim();
        cleanedResponse[cleanedKey] = typedResponse[key];
      });
      
      setStats(cleanedResponse);
    } catch (err) {
      console.error('Region Stats Error:', err);
      setError('통계 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [voteId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const datasets = useMemo(() => {
    if (!stats) return [];
    
    const data = Object.entries(stats).map(([region, data]) => {
      const total = Object.values(data.stat).reduce<number>((sum, count) => sum + Number(count), 0);
      return {
        region,
        total,
        details: data.stat
      };
    });

    return data.sort((a, b) => b.total - a.total);
  }, [stats]);

  const totalParticipants = useMemo(() => 
    datasets.reduce((sum, { total }) => sum + total, 0),
    [datasets]
  );

  const chartData = useMemo(() => 
    datasets.map(({ region, total }, index) => ({
      name: `${region}`,
      population: total,
      color: CHART_COLORS[index % CHART_COLORS.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    })),
    [datasets]
  );

  const maxParticipationRegion = useMemo(() => 
    datasets[0],
    [datasets]
  );

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error || !stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || '데이터를 불러올 수 없습니다.'}</Text>
      </View>
    );
  }

  console.log('[DEBUG] stats 데이터:', stats);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>지역별 투표 분포</Text>
      
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
          hasLegend={true}
          center={[10, 10]}
          avoidFalseZero
        />
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>상세 통계</Text>
        {datasets.map(({ region, total, details }) => (
          <View key={region} style={styles.regionSection}>
            <View style={styles.regionHeader}>
              <Text style={styles.label}>{region}</Text>
              <Text style={styles.value}>
                총 {total}명 ({((total / totalParticipants) * 100).toFixed(1)}%)
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
        AI 분석 결과: {maxParticipationRegion.region}에서 가장 높은 참여율({((maxParticipationRegion.total / totalParticipants) * 100).toFixed(1)}%)을 보였으며, 
        이는 해당 지역의 관심도가 특히 높았음을 나타냅니다.
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
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  regionSection: {
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
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  optionsList: {
    paddingLeft: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
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
  skeletonStatsTitle: {
    height: 24,
    width: '30%',
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 16,
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

export default RegionStatistics; 