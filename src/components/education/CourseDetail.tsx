import React, { useState, useEffect } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { 
  Play, 
  Lock, 
  Clock, 
  Users, 
  Star,
  Calendar as CalendarIcon,
  Video,
  Mic,
  BookOpen,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { coursesApi } from '../../api/education/courses.api';
import { useActiveAccount } from "thirdweb/react";

interface CourseDetailProps {
  courseId: string;
  onClose: () => void;
}

export default function CourseDetail({ courseId, onClose }: CourseDetailProps) {
  const { t, currentLanguage } = useI18n();
  const activeAccount = useActiveAccount();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [userAccess, setUserAccess] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [meetingType, setMeetingType] = useState<'zoom' | 'voov'>('zoom');
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    loadCourseData();
  }, [courseId, currentLanguage]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const walletAddress = activeAccount?.address;
      
      // 获取课程基本信息
      const coursesData = await coursesApi.getCourses(currentLanguage);
      const courseData = coursesData.find((c: any) => c.id === courseId);
      setCourse(courseData);
      
      // 获取用户访问权限
      if (walletAddress) {
        const accessData = await coursesApi.getCourseAccess(walletAddress);
        setUserAccess(accessData);
      }
      
      // 如果是video类型，获取lessons
      if (courseData?.courseType === 'video') {
        const lessonsData = await coursesApi.getCourseLessons(courseId, currentLanguage, walletAddress);
        setLessons(lessonsData);
      }
    } catch (error) {
      console.error('Failed to load course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!activeAccount?.address || !course) return;
    
    try {
      await coursesApi.purchaseCourse(courseId, course.priceBCC, activeAccount.address);
      await loadCourseData(); // Refresh data after purchase
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const handleBookOnlineCourse = async () => {
    if (!activeAccount?.address || !selectedDate || !selectedTime) return;
    
    const scheduledDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
    
    try {
      const result = await coursesApi.bookOnlineCourse(
        courseId, 
        scheduledDateTime.toISOString(), 
        meetingType, 
        activeAccount.address
      );
      setBookingResult(result.booking);
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const updateLessonProgress = async (lessonId: string, progress: number) => {
    if (!activeAccount?.address) return;
    
    try {
      await coursesApi.updateProgress(courseId, progress, activeAccount.address, lessonId);
      // 可以在这里更新UI状态
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const hasAccess = userAccess.some((access: any) => access.courseId === courseId);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
            <p className="mt-4">Loading course details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p>Course not found</p>
            <Button onClick={onClose} className="mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={course.courseType === 'online' ? 'default' : 'secondary'}>
                {course.courseType === 'online' ? (
                  <>
                    <Video className="w-3 h-3 mr-1" />
                    Live Online
                  </>
                ) : (
                  <>
                    <BookOpen className="w-3 h-3 mr-1" />
                    Video Course
                  </>
                )}
              </Badge>
              <Badge variant="outline">{course.difficultyLevel}</Badge>
            </div>
            <CardTitle className="text-2xl text-honey mb-2">{course.title}</CardTitle>
            <p className="text-muted-foreground">{course.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {course.duration}h
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {course.totalEnrollments} students
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {course.averageRating}/5
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>×</Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Course Price and Purchase */}
          <div className="bg-secondary p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-honey">{course.priceBCC} BCC</p>
                <p className="text-sm text-muted-foreground">One-time purchase</p>
              </div>
              {!hasAccess ? (
                <Button 
                  onClick={handlePurchase}
                  className="bg-honey text-secondary hover:bg-honey/90"
                  disabled={!activeAccount?.address}
                >
                  Purchase Course
                </Button>
              ) : (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Purchased
                </Badge>
              )}
            </div>
          </div>

          {/* Online Course Booking */}
          {course.courseType === 'online' && hasAccess && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Schedule Your Session</h3>
              {!bookingResult ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Date</label>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date()}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Select Time</label>
                        <Input
                          type="time"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Meeting Platform</label>
                        <div className="flex gap-2">
                          <Button
                            variant={meetingType === 'zoom' ? 'default' : 'outline'}
                            onClick={() => setMeetingType('zoom')}
                            size="sm"
                          >
                            <Video className="w-4 h-4 mr-1" />
                            Zoom
                          </Button>
                          <Button
                            variant={meetingType === 'voov' ? 'default' : 'outline'}
                            onClick={() => setMeetingType('voov')}
                            size="sm"
                          >
                            <Mic className="w-4 h-4 mr-1" />
                            VooV
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={handleBookOnlineCourse}
                    disabled={!selectedDate || !selectedTime}
                    className="w-full"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Book Session
                  </Button>
                </>
              ) : (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">Booking Confirmed!</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Meeting URL:</strong> {bookingResult.meetingUrl}</p>
                    <p><strong>Meeting ID:</strong> {bookingResult.meetingId}</p>
                    <p><strong>Password:</strong> {bookingResult.meetingPassword}</p>
                    <p><strong>Verification Code:</strong> {bookingResult.verificationCode}</p>
                    <p className="text-green-700 font-medium">{bookingResult.instructions}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Course Lessons */}
          {course.courseType === 'video' && lessons.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Course Lessons</h3>
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <Card key={lesson.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex-shrink-0">
                            {lesson.canAccess ? (
                              <Play className="w-5 h-5 text-green-500" />
                            ) : (
                              <Lock className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{lesson.title}</h4>
                            <p className="text-sm text-muted-foreground">{lesson.description}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {lesson.duration} min
                              </span>
                              {lesson.isFree && (
                                <Badge variant="outline" className="text-xs">FREE</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {lesson.canAccess ? (
                            <Button 
                              size="sm"
                              onClick={() => updateLessonProgress(lesson.id, 100)}
                            >
                              Watch
                            </Button>
                          ) : (
                            <Button size="sm" disabled>
                              <Lock className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Instructor Info */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Instructor</h3>
            {course.instructors.map((instructor: any, index: number) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-medium">{instructor.name}</h4>
                  <p className="text-sm text-muted-foreground">{instructor.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}