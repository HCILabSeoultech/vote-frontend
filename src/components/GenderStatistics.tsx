import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getVoteStatisticsByGender } from '../api/post';
import { GenderStatistics as GenderStatsType } from '../types/Vote';
import Animated, { 
  FadeIn, 
  SlideInRight,
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming 
} from 'react-native-reanimated';

interface Props {
  voteId: number;
}

const GENDER_COLORS = {
  MALE: '#4299E1',
  FEMALE: '#F687B3',
};

const GENDER_LABELS = {
  MALE: '남성',
  FEMALE: '여성',
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
      
      <Animated.View style={[styles.chartContainer, animatedStyle]}>
        <View style={styles.skeletonChart} />
      </Animated.View>
      
      <View style={styles.statsContainer}>
        <View style={styles.skeletonStatsTitle} />
        {[1, 2].map((index) => (
          <Animated.View key={index} style={[styles.genderSection, animatedStyle]}>
            <View style={styles.genderHeader}>
              <View style={styles.skeletonLabel} />
              <View style={styles.skeletonValue} />
            </View>
            <View style={styles.optionsList}>
              {[1, 2, 3].map((optionIndex) => (
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

const GenderStatistics = ({ voteId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GenderStatsType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const response = await getVoteStatisticsByGender(voteId);
      setStats(response);
    } catch (err) {
      console.error('Gender Stats Error:', err);
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
    
    return Object.entries(stats).map(([gender, data]) => {
      const total = Object.values(data.stat).reduce((sum, count) => sum + count, 0);
      return {
        gender,
        total,
        details: data.stat
      };
    });
  }, [stats]);

  const totalParticipants = useMemo(() => 
    datasets.reduce((sum, { total }) => sum + total, 0),
    [datasets]
  );

  const chartData = useMemo(() => 
    datasets.map(({ gender, total }) => ({
      name: GENDER_LABELS[gender as keyof typeof GENDER_LABELS] || gender,
      population: total,
      color: GENDER_COLORS[gender as keyof typeof GENDER_COLORS] || '#A0AEC0',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    })),
    [datasets]
  );

  const { maxParticipationGender, genderDiff } = useMemo(() => {
    const maxParticipationGender = datasets.reduce((max, current) => 
      current.total > max.total ? current : max,
      datasets[0]
    );

    const genderDiff = datasets.length >= 2 ? 
      Math.abs(datasets[0].total - datasets[1].total) : 
      0;

    return { maxParticipationGender, genderDiff };
  }, [datasets]);

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error || !stats || datasets.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error || '데이터를 불러올 수 없습니다.'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.headerContainer}>
        <Text style={styles.title}>성별 투표 분포</Text>
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
                decimalPlaces: 2,
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
            {datasets.map(({ gender, total }, index) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.quickStatItem,
                  selectedGender === gender && styles.selectedQuickStatItem
                ]}
                onPress={() => setSelectedGender(gender === selectedGender ? null : gender)}
              >
                <View style={[styles.colorIndicator, { backgroundColor: GENDER_COLORS[gender as keyof typeof GENDER_COLORS] || '#A0AEC0' }]} />
                <Text style={styles.quickStatText}>
                  {GENDER_LABELS[gender as keyof typeof GENDER_LABELS] || gender} ({total}명)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>상세 통계</Text>
        {datasets.map(({ gender, total, details }, index) => (
          <Animated.View
            key={gender}
            entering={SlideInRight.delay(index * 100).springify()}
            style={[
              styles.genderSection,
              selectedGender === gender && styles.selectedGenderSection
            ]}
          >
            <View style={styles.genderHeader}>
              <View style={styles.genderLabelContainer}>
                <Text style={styles.label}>
                  {GENDER_LABELS[gender as keyof typeof GENDER_LABELS] || gender}
                </Text>
                <View style={[styles.colorIndicator, { backgroundColor: GENDER_COLORS[gender as keyof typeof GENDER_COLORS] || '#A0AEC0' }]} />
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
          {GENDER_LABELS[maxParticipationGender.gender as keyof typeof GENDER_LABELS] || maxParticipationGender.gender}의 
          참여율이 더 높게 나타났으며 ({maxParticipationGender.total}명, 
          {((maxParticipationGender.total / totalParticipants) * 100).toFixed(1)}%), 
          성별 간의 차이는 {genderDiff}명입니다.
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
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  quickStatText: {
    fontSize: 14,
    color: '#2D3748',
    marginLeft: 8,
    fontWeight: '500',
  },
  statsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  genderSection: {
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
  genderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  genderLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3748',
    marginRight: 8,
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
  headerContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  totalParticipants: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 8,
    fontWeight: '500',
  },
  selectedQuickStatItem: {
    backgroundColor: '#EBF8FF',
    borderColor: '#4299E1',
    borderWidth: 1,
  },
  selectedGenderSection: {
    borderColor: '#4299E1',
    borderWidth: 2,
    backgroundColor: '#F7FAFC',
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
});

export default GenderStatistics; 