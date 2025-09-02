import React, { use, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Easing, Modal, TextInput, Keyboard, TouchableWithoutFeedback } from "react-native";
import { GestureHandlerRootView, PanGestureHandler } from "react-native-gesture-handler";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

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
  const [isModalVisible,setIsModalVisible] = useState(false);
  
  // 모달 관련 state
  const [modalActiveTab, setModalActiveTab] = useState('식단');
  const [modalContent, setModalContent] = useState('');
  
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
  const [recordList,setRecordList] = useState([]);

  // 날짜 포맷팅 함수
  const formatDateForDisplay = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${year}년 ${month}월 ${day}일`;
  };

  // 모달 열기 함수
  const openModal = () => {
    setModalActiveTab('식단');
    setModalContent('');
    setIsModalVisible(true);
  };

  // 모달 닫기 함수
  const closeModal = () => {
    setIsModalVisible(false);
    setModalActiveTab('식단');
    setModalContent('');
    loadTodata();
  };

  // 키보드 닫기 함수
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // 저장 함수
const saveModalData = async () => {
  if (!modalContent.trim()) return;
  
  try {
    // 키보드 먼저 닫기
    Keyboard.dismiss();
    
    const data = {
      type: modalActiveTab,
      content: modalContent,
      date: selectDate,
      timestamp: new Date().toISOString()
    };
    

    
    // 현재 년도/월 계산
    
    const storageKey = `CALENDAR_${yearArr[currentYearIndex]}_${currentMonth}`;
    
    // 기존 데이터 로드
    const existingData = await AsyncStorage.getItem(storageKey);
    let monthRecords = existingData ? JSON.parse(existingData) : [];
    
    // 새 기록 추가
    const newRecord = {
      id: Date.now() + Math.random(),
      ...data,
      day: parseInt(selectDate.split('-')[2])
    };
    
    monthRecords.push(newRecord);
    
    // 날짜순 정렬
    monthRecords.sort((a, b) => a.day - b.day);
    
    // 저장
    await AsyncStorage.setItem(storageKey, JSON.stringify(monthRecords));
    
    console.log('✅ 저장 완료!');
    closeModal();
  } catch (error) {
    console.error('저장 실패:', error);
  }
};

const loadTodata = async () => {
  try {
    const storageKey = `CALENDAR_${yearArr[currentYearIndex]}_${currentMonth}`;
    const stored = await AsyncStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    console.log("📌 불러온 데이터:", parsed);
    setRecordList(parsed);
  } catch (error) {
    console.error("불러오기 실패:", error);
    setRecordList([]); // fallback
  }
};


// useEffect(()=>{},[recordList])

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
    loadTodata()
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
const deleteRecord = async (recordId, date) => {
  try {
    const [year, month] = date.split('-').map(Number);
    const storageKey = `CALENDAR_${year}_${month-1}`;
    
    // 해당 월 데이터 로드
    const existingData = await AsyncStorage.getItem(storageKey);
    
    if (!existingData) {
      console.log('해당 월에 데이터가 없습니다.');
      return false;
    }
    
    const monthRecords = JSON.parse(existingData);
    
    // 해당 ID 기록 삭제
    const updatedRecords = monthRecords.filter(record => record.id !== recordId);
    
    // 삭제된 기록이 있는지 확인
    if (updatedRecords.length === monthRecords.length) {
      console.log('삭제할 기록을 찾을 수 없습니다.');
      return false;
    }
    
    // 업데이트된 데이터 저장
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedRecords));
    
    console.log(`✅ 기록 삭제됨 - ID: ${recordId}`);
    loadTodata()
  } catch (error) {
    console.error('기록 삭제 실패:', error);
    return false;
  }
};
  useEffect(() => {initData()},[initData])
  
  return (    
    <>
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
                      {tab} {recordList.filter(x=>x.type===tab).length}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
      {Array.isArray(recordList) && recordList.filter(x=>x.type===activeTab).length === 0 && (
        <View style={{marginTop:20}}>
          <Text style={{textAlign:'center',fontSize:15}}>아직 등록된 기록이 없습니다.</Text>
          <Text style={{textAlign:'center',fontSize:15}}>+ 버튼을 클릭하여 등록하세요.</Text>          
        </View>
      )}

      {Array.isArray(recordList) && recordList.filter(x=>x.type===activeTab).length > 0 && (
        recordList.filter(x=>x.type===activeTab).map((el, idx) => (
          <View key={el.id ?? idx} style={{width:'100%',height:40,flexDirection:'row',alignItems:'center'}}>
            <Text style={{marginRight:10}}>{idx+1}. </Text>
            <Text style={{color:'#000',}}>{el.content}</Text>
              <TouchableOpacity onPress={()=>{deleteRecord(el.id,el.date)}} style={{backgroundColor:"#E62727",width:30,height:30,borderRadius:10,alignItems:'center',justifyContent:'center',marginLeft:10}}>
                <Ionicons name="close" size={25} color="#fff" />
              </TouchableOpacity>
          </View>
        ))
      )}

       
            </View>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
      
      <TouchableOpacity onPress={openModal} style={styles.plusBtnWrap}>
        <View style={styles.plusBtn}>
          <Text style={styles.plusBtnTxt}>+</Text>
        </View>
      </TouchableOpacity>
      
      <Modal animationType="slide" visible={isModalVisible} transparent={true}>
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalView}>
                {/* 헤더 */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>기록등록</Text>
                  <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                    <Ionicons name="close" size={25} color="#555" />
                  </TouchableOpacity>
                </View>

                {/* 탭 선택 */}
                <View style={styles.modalTabContainer}>
                  {['식단', '운동', '신체'].map((tab) => (
                    <TouchableOpacity
                      key={tab}
                      style={[
                        styles.modalTabButton,
                        modalActiveTab === tab && styles.modalActiveTabButton
                      ]}
                      onPress={() => {
                        setModalActiveTab(tab);
                        dismissKeyboard();
                      }}
                    >
                      <Text style={[
                        styles.modalTabButtonText,
                        modalActiveTab === tab && styles.modalActiveTabButtonText
                      ]}>
                        {tab}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 선택된 날짜 표시 */}
                <TouchableWithoutFeedback onPress={dismissKeyboard}>
                  <View style={styles.selectedDateContainer}>
                    <Text style={styles.dateLabel}>선택된 날짜</Text>
                    <View style={styles.dateDisplayBox}>
                      <Text style={styles.dateDisplayText}>
                        {formatDateForDisplay(selectDate)}
                      </Text>
                    </View>
                  </View>
                </TouchableWithoutFeedback>

                {/* 내용 입력 */}
                <View style={styles.contentContainer}>
                  <Text style={styles.contentLabel}>{modalActiveTab} 내용</Text>
                  <TextInput
                    style={styles.contentInput}
                    placeholder={`${modalActiveTab} 내용을 입력하세요...`}
                    value={modalContent}
                    onChangeText={setModalContent}
                    multiline={true}
                    textAlignVertical="top"
                    returnKeyType="done"
                    onSubmitEditing={dismissKeyboard}
                    blurOnSubmit={true}
                  />
                </View>

                {/* 버튼들 */}
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => {
                      dismissKeyboard();
                      closeModal();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.saveButton,
                      !modalContent.trim() && styles.disabledButton
                    ]} 
                    onPress={saveModalData}
                    disabled={!modalContent.trim()}
                  >
                    <Text style={styles.saveButtonText}>저장</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
  plusBtnWrap: {
    position: 'absolute',
    bottom: 140,
    right: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  plusBtn: {
    backgroundColor: '#007AFF',
    height: 60,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  plusBtnTxt: {
    fontSize: 30,
    color: 'white',
  },
  // 모달 관련 스타일들
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#007AFF',
  },
  closeButton: {
    padding: 5,
  },
  modalTabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 4,
  },
  modalTabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActiveTabButton: {
    backgroundColor: '#007AFF',
  },
  modalTabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modalActiveTabButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  selectedDateContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateDisplayBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
  },
  dateDisplayText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  contentContainer: {
    marginBottom: 20,
  },
  contentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 120,
    backgroundColor: '#f9f9f9',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});