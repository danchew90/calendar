import React, { use, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Easing } from "react-native";
import { GestureHandlerRootView, PanGestureHandler } from "react-native-gesture-handler";

export function Calendar() {
  const getDate = new Date();
  const year = getDate.getFullYear();
  const month = getDate.getMonth() + 1;
  const day = getDate.getDate();
  const today = year + "-" + month + "-" + day;
  const [yearArr,setYearArr] = useState([year-1,year,year+1]);
  const [calData,setCalData] = useState([]);
  const [currentYearIndex, setCurrentYearIndex] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(month - 1);
  const week = ['일', '월', '화', '수', '목', '금', '토'];
  const [selectDate, setSelectDate] = useState(today);
  
  const screenHeight = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  
  // 동적으로 최대 높이 계산 (헤더 + 요일 헤더 + 캘린더 한 줄)
  const headerHeight = 50 + 15 * 2; // paddingTop + paddingVertical
  const titleHeight = 24 + 10; // fontSize + marginBottom 
  const weekHeaderHeight = 16 + 10 * 2; // fontSize + paddingVertical
  const oneWeekRowHeight = 50 + 4; // dayCell height + margin
  const reservedHeight = headerHeight + titleHeight + weekHeaderHeight + oneWeekRowHeight + 115; // 여유 공간
  const maxBottomSheetHeight = screenHeight - reservedHeight;
  
  // 버튼이 보이도록 최소 높이 계산
  const tabButtonHeight = 40; // paddingVertical * 2 + fontSize
  const handleHeight = 4 + 16; // handle height + margins
  const minRequiredHeight = handleHeight + 20 + tabButtonHeight + 20; // handle + margin + button + margin
  const minBottomSheetHeight = Math.max(screenHeight * 0.1, minRequiredHeight);
  
  const bottomSheetHeight = useRef(new Animated.Value(minBottomSheetHeight)).current;
  const lastSwipeTime = useRef(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextMonthData, setNextMonthData] = useState(null);
  const [prevMonthData, setPrevMonthData] = useState(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(false);
  const horizontalScrollRef = useRef(null);
  const lastScrollTime = useRef(0);
  const [activeTab, setActiveTab] = useState('식단');


  const initData = useCallback(() => {
    const newCalData = yearArr.map((y) => {
      return Array.from({length: 12}, (_, monthIndex) => {
        const m = monthIndex + 1;
        const lastDate = new Date(y, m, 0).getDate();
        return Array.from({length: lastDate}, (_, dayIndex) => {
          const d = dayIndex + 1;
          return {
            date: d,
            year: y,
            month: m,
            dateOffWeek: new Date(y, m-1, d).getDay(),
            sun: new Date(y, m-1, d).getDay() === 0,
            sat: new Date(y, m-1, d).getDay() === 6,
          };
        });
      });
    });
    
    setCalData(newCalData);
    updateAdjacentMonthData(newCalData);
  }, [yearArr, updateAdjacentMonthData]);

  const updateAdjacentMonthData = useCallback((calendarData) => {
    // 이전 달 데이터
    let prevYear = currentYearIndex;
    let prevMonth = currentMonth - 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = currentYearIndex - 1;
    }
    
    // 다음 달 데이터
    let nextYear = currentYearIndex;
    let nextMonth = currentMonth + 1;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear = currentYearIndex + 1;
    }
    
    if (calendarData && calendarData[prevYear] && calendarData[prevYear][prevMonth]) {
      setPrevMonthData(calendarData[prevYear][prevMonth]);
    } else {
      setPrevMonthData(null);
    }
    
    if (calendarData && calendarData[nextYear] && calendarData[nextYear][nextMonth]) {
      setNextMonthData(calendarData[nextYear][nextMonth]);
    } else {
      setNextMonthData(null);
    }
  }, [currentYearIndex, currentMonth]);

  useEffect(() => {
    if (calData.length > 0) {
      updateAdjacentMonthData(calData);
    }
  }, [currentMonth, currentYearIndex, calData]);

  const animateSlide = (direction, callback) => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    slideAnim.setValue(0);
    
    Animated.timing(slideAnim, {
      toValue: direction === 'left' ? -screenWidth : screenWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      callback();
      slideAnim.setValue(direction === 'left' ? screenWidth : -screenWidth);
      
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setIsAnimating(false);
      });
    });
  };

  const goToPreviousMonth = () => {
    animateSlide('right', () => {
      if (currentMonth === 0) {
        if (currentYearIndex > 0) {
          setCurrentYearIndex(currentYearIndex - 1);
          setCurrentMonth(11);
        } else {
          // 년도를 확장하고 데이터 재설정
          const newYearArr = [yearArr[0] - 1, ...yearArr];
          setYearArr(newYearArr);
          setCurrentYearIndex(1);
          setCurrentMonth(11);
        }
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    });
  };

  const goToNextMonth = () => {
    animateSlide('left', () => {
      if (currentMonth === 11) {
        if (currentYearIndex < yearArr.length - 1) {
          setCurrentYearIndex(currentYearIndex + 1);
          setCurrentMonth(0);
        } else {
          // 년도를 확장하고 데이터 재설정
          const newYearArr = [...yearArr, yearArr[yearArr.length - 1] + 1];
          setYearArr(newYearArr);
          setCurrentMonth(0);
        }
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    });
  };

  const renderCalendarGrid = () => {
    if (!calData || !calData[currentYearIndex] || !calData[currentYearIndex][currentMonth]) {
      return null;
    }

    const monthData = calData[currentYearIndex][currentMonth];
    const firstDay = monthData[0].dateOffWeek;
    
    const calendarRows = [];
    const daysInMonth = monthData.length;
    let dayIndex = 0;
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        if (week === 0 && dayOfWeek < firstDay) {
          weekDays.push(<View key={`empty-${dayOfWeek}`} style={styles.emptyDay} />);
        } else if (dayIndex < daysInMonth) {
          const dayData = monthData[dayIndex];
          const fullDate = dayData.year + '-' + dayData.month + '-' + dayData.date
          const isSelected = dayData.year + '-' + dayData.month + '-' + dayData.date === selectDate;
          console.log(dayData.sun, dayData.sat);
          weekDays.push(
            <TouchableOpacity 
              key={`day-${dayIndex}`} 
              style={[styles.dayCell, isSelected && styles.today]}
              onPress={() => setSelectDate(fullDate)}
            >
              <Text style={[styles.dayText, dayData.sun && styles.sunText, dayData.sat && styles.satText]}>
                {dayData.date}
              </Text>
            </TouchableOpacity>
          );
          dayIndex++;
        } else {
          weekDays.push(<View key={`empty-end-${dayOfWeek}`} style={styles.emptyDay} />);
        }
      }
      
      calendarRows.push(
        <View key={`week-${week}`} style={styles.weekRow}>
          {weekDays}
        </View>
      );
      
      if (dayIndex >= daysInMonth) break;
    }
    
    return calendarRows;
  };

  const renderCalendarGridForData = (monthData) => {
    if (!monthData) return null;
    
    const firstDay = monthData[0].dateOffWeek;
    const calendarRows = [];
    const daysInMonth = monthData.length;
    let dayIndex = 0;
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        if (week === 0 && dayOfWeek < firstDay) {
          weekDays.push(<View key={`empty-${dayOfWeek}`} style={styles.emptyDay} />);
        } else if (dayIndex < daysInMonth) {
          const dayData = monthData[dayIndex];
          const fullDate = dayData.year + '-' + dayData.month + '-' + dayData.date;
          const isSelected = fullDate === selectDate;
          
          weekDays.push(
            <TouchableOpacity 
              key={`day-${dayIndex}`} 
              style={[styles.dayCell, isSelected && styles.today]}
              onPress={() => setSelectDate(fullDate)}
            >
              <Text style={[styles.dayText, dayData.sun && styles.sunText, dayData.sat && styles.satText]}>
                {dayData.date}
              </Text>
            </TouchableOpacity>
          );
          dayIndex++;
        } else {
          weekDays.push(<View key={`empty-end-${dayOfWeek}`} style={styles.emptyDay} />);
        }
      }
      
      calendarRows.push(
        <View key={`week-${week}`} style={styles.weekRow}>
          {weekDays}
        </View>
      );
      
      if (dayIndex >= daysInMonth) break;
    }
    
    return calendarRows;
  };

  const renderHorizontalCalendar = () => {
    if (!calData || !calData[currentYearIndex] || !calData[currentYearIndex][currentMonth]) {
      return null;
    }

    const monthData = calData[currentYearIndex][currentMonth];
    
    const handleScrollEnd = (event) => {
      const currentTime = Date.now();
      
      // 애니메이션 중이거나 최근 스크롤 이벤트가 있었으면 무시
      if (isAnimating || currentTime - lastScrollTime.current < 1000) return;
      
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const contentWidth = event.nativeEvent.contentSize.width;
      const layoutWidth = event.nativeEvent.layoutMeasurement.width;
      
      // 더 엄격한 조건으로 끝점 확인
      const isAtEnd = contentOffsetX + layoutWidth >= contentWidth - 5;
      const isAtStart = contentOffsetX <= 5;
      
      if (isAtEnd || isAtStart) {
        lastScrollTime.current = currentTime;
        
        if (isAtEnd) {
          goToNextMonthDirect();
        } else if (isAtStart) {
          goToPreviousMonthDirect();
        }
      }
    };

    return (
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalCalendarContainer}
        onMomentumScrollEnd={handleScrollEnd}
        pagingEnabled={false}
        decelerationRate="fast"
      >
        {monthData.map((dayData, index) => {
          const fullDate = dayData.year + '-' + dayData.month + '-' + dayData.date;
          const isSelected = fullDate === selectDate;
          const isToday = dayData.year === year && dayData.month === month && dayData.date === day;
          
          return (
            <TouchableOpacity 
              key={`horizontal-day-${index}`} 
              style={[
                styles.horizontalDayCell, 
                isSelected && styles.today
              ]}
              onPress={() => setSelectDate(fullDate)}
            >
              <Text style={[
                styles.horizontalDayText, 
                dayData.sun && styles.sunText, 
                dayData.sat && styles.satText,
              ]}>
                {dayData.date}
              </Text>
              <Text style={[
                styles.horizontalWeekText,
              ]}>
                {week[dayData.dateOffWeek]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // 캘린더 데이터를 미리 메모화
  const currentMonthGrid = useMemo(() => {
    return renderCalendarGrid();
  }, [calData, currentYearIndex, currentMonth, selectDate]);

  const prevMonthGrid = useMemo(() => {
    return prevMonthData ? renderCalendarGridForData(prevMonthData) : null;
  }, [prevMonthData, selectDate]);

  const nextMonthGrid = useMemo(() => {
    return nextMonthData ? renderCalendarGridForData(nextMonthData) : null;
  }, [nextMonthData, selectDate]);

  const handleCalendarSwipe = (event) => {
    if (isAnimating) return;
    
    const { translationX, translationY } = event.nativeEvent;
    
    // 위로 올리는 제스처만 캘린더에서 처리 (바텀시트 확장)
    if (translationY < 0 && Math.abs(translationY) > Math.abs(translationX)) {
      handleBottomSheetGesture(event);
    } else if (Math.abs(translationX) > Math.abs(translationY)) {
      // 가로 제스처 (캘린더 슬라이드)
      slideAnim.setValue(translationX);
    }
  };

  const handleCalendarSwipeEnd = (event) => {
    if (isAnimating) return;
    
    const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;
    
    // 위로 올리는 제스처만 캘린더에서 처리
    if (translationY < 0 && Math.abs(translationY) > Math.abs(translationX)) {
      handleBottomSheetEnd(event);
    } else if (Math.abs(translationX) > Math.abs(translationY)) {
      // 가로 제스처 (캘린더 슬라이드)
      const threshold = screenWidth * 0.3;
      
      if (Math.abs(translationX) > threshold || Math.abs(velocityX) > 1000) {
        if (translationX > 0) {
          // 오른쪽으로 스와이프 - 이전 달
          setIsAnimating(true);
          Animated.timing(slideAnim, {
            toValue: screenWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            goToPreviousMonthDirect();
            slideAnim.setValue(0);
            setIsAnimating(false);
          });
        } else {
          // 왼쪽으로 스와이프 - 다음 달
          setIsAnimating(true);
          Animated.timing(slideAnim, {
            toValue: -screenWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            goToNextMonthDirect();
            slideAnim.setValue(0);
            setIsAnimating(false);
          });
        }
      } else {
        // 원래 위치로 복귀
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
        }).start();
      }
    }
  };

  const goToPreviousMonthDirect = () => {
    setIsAnimating(true);
    
    if (currentMonth === 0) {
      if (currentYearIndex > 0) {
        setCurrentYearIndex(currentYearIndex - 1);
        setCurrentMonth(11);
      } else {
        const newYearArr = [yearArr[0] - 1, ...yearArr];
        setYearArr(newYearArr);
        setCurrentYearIndex(1);
        setCurrentMonth(11);
      }
    } else {
      setCurrentMonth(currentMonth - 1);
    }

    // 렌더링 완료 후 스크롤 위치 조정
    setTimeout(() => {
      if (isBottomSheetExpanded && horizontalScrollRef.current) {
        horizontalScrollRef.current?.scrollToEnd({ animated: false });
      }
      setIsAnimating(false);
      lastScrollTime.current = Date.now(); // 스크롤 시간 업데이트
    }, 300);
  };

  const goToNextMonthDirect = () => {
    setIsAnimating(true);
    
    if (currentMonth === 11) {
      if (currentYearIndex < yearArr.length - 1) {
        setCurrentYearIndex(currentYearIndex + 1);
        setCurrentMonth(0);
      } else {
        const newYearArr = [...yearArr, yearArr[yearArr.length - 1] + 1];
        setYearArr(newYearArr);
        setCurrentMonth(0);
      }
    } else {
      setCurrentMonth(currentMonth + 1);
    }

    // 렌더링 완료 후 스크롤 위치 조정
    setTimeout(() => {
      if (isBottomSheetExpanded && horizontalScrollRef.current) {
        horizontalScrollRef.current?.scrollTo({ x: 0, animated: false });
      }
      setIsAnimating(false);
      lastScrollTime.current = Date.now(); // 스크롤 시간 업데이트
    }, 300);
  };

  const handleBottomSheetGesture = (event) => {
    const { translationY } = event.nativeEvent;
    const currentHeight = bottomSheetHeight._value;
    const minHeight = minBottomSheetHeight; // 버튼이 보이는 최소 높이 사용
    const maxHeight = maxBottomSheetHeight; // 동적으로 계산된 높이 사용
    
    let newHeight = currentHeight - translationY;
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    
    bottomSheetHeight.setValue(newHeight);
  };

  const handleBottomSheetEnd = (event) => {
    const { translationY } = event.nativeEvent;
    const currentHeight = bottomSheetHeight._value;
    const minHeight = minBottomSheetHeight; // 버튼이 보이는 최소 높이 사용
    const maxHeight = maxBottomSheetHeight; // 동적으로 계산된 높이 사용
    const midHeight = (minHeight + maxHeight) / 2;
    
    let targetHeight;
    if (currentHeight < midHeight) {
      targetHeight = minHeight;
      setIsBottomSheetExpanded(false);
    } else {
      targetHeight = maxHeight;
      setIsBottomSheetExpanded(true);
    }
    
    Animated.spring(bottomSheetHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      tension: 30,
      friction: 8,
    }).start();
  };

  useEffect(() => {initData()},[initData])
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'<'}</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>
          {yearArr[currentYearIndex]}년 {currentMonth + 1}월
        </Text>
        
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {!isBottomSheetExpanded && (
        <View style={styles.weekHeader}>
          {week.map((dayName, index) => (
            <Text key={index} style={styles.weekHeaderText}>
              {dayName}
            </Text>
          ))}
        </View>
      )}

      {isBottomSheetExpanded ? (
        // 바텀시트 확장 시 - 가로 스크롤 캘린더
        <View style={styles.horizontalCalendarWrapper}>
          {renderHorizontalCalendar()}
        </View>
      ) : (
        // 바텀시트 축소 시 - 기존 그리드 캘린더  
        <PanGestureHandler
          onGestureEvent={handleCalendarSwipe}
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === 5) {
              handleCalendarSwipeEnd(event);
            }
          }}
        >
          <View style={styles.calendarContainer}>
            {/* 이전 달 */}
            <Animated.View 
              style={[
                styles.monthView,
                {
                  transform: [{ translateX: Animated.subtract(slideAnim, screenWidth) }]
                }
              ]}
            >
              {prevMonthGrid}
            </Animated.View>
            
            {/* 현재 달 */}
            <Animated.View 
              style={[
                styles.monthView,
                {
                  transform: [{ translateX: slideAnim }]
                }
              ]}
            >
              {currentMonthGrid}
            </Animated.View>
            
            {/* 다음 달 */}
            <Animated.View 
              style={[
                styles.monthView,
                {
                  transform: [{ translateX: Animated.add(slideAnim, screenWidth) }]
                }
              ]}
            >
              {nextMonthGrid}
            </Animated.View>
          </View>
        </PanGestureHandler>
      )}

      <PanGestureHandler
        onGestureEvent={handleBottomSheetGesture}
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === 5) {
            handleBottomSheetEnd(event);
          }
        }}
      >
        <Animated.View 
          style={[
            styles.bottomSheet, 
            {
              height: bottomSheetHeight,
            }
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <View style={styles.bottomSheetContent}>            
            <View style={styles.tabContainer}>
              {['식단', '운동', '신체'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    activeTab === tab && styles.activeTabButton
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[
                    styles.tabButtonText,
                    activeTab === tab && styles.activeTabButtonText
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.bottomSheetTitle}>선택된 날짜</Text>
            <Text style={styles.selectedDateText}>{selectDate}</Text>            
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  weekHeader: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#f5f5f5",
  },
  weekHeaderText: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  calendarContainer: {
    flex: 1,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  monthView: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  dayCell: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
  },
  dayText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
  emptyDay: {
    width: 45,
    height: 45,
    margin: 2,
  },
  today: {
    borderColor: "#007AFF",
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: "none",

  },
  todayText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  sunText: {
    color: "#f44336",    
  },
  satText: {
    color: "#2196f3",    
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  bottomSheetContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  selectedDateText: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 20,
  },
  horizontalCalendarWrapper: {
    height: 80,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  horizontalCalendarContainer: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  horizontalDayCell: {
    width: 50,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
    borderRadius: 8,
  },
  horizontalDayText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  horizontalWeekText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  todayHighlight: {
    backgroundColor: "#f0f8ff",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 5,
    marginBottom: 20,
  },
  tabButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    minWidth: 100,
  },
  activeTabButton: {
    backgroundColor: "#007AFF",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
  },
  activeTabButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
