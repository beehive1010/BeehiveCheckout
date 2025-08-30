import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useWallet } from '../../../hooks/useWallet';
import { useI18n } from '../../../contexts/I18nContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { useToast } from '../../../hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import HexagonIcon from '../../shared/components/HexagonIcon';

interface Course {
  id: string;
  title: string;
  description: string;
  requiredLevel: number;
  priceBCC: number;
  isFree: boolean;
  duration: string;
  courseType: 'online' | 'video';
  zoomMeetingId?: string;
  zoomPassword?: string;
  zoomLink?: string;
  videoUrl?: string;
  downloadLink?: string;
}

interface CourseLesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  lessonOrder: number;
  priceBCC: number;
  isFree: boolean;
}

interface CourseAccess {
  id: string;
  walletAddress: string;
  courseId: string;
  progress: number;
  completed: boolean;
  grantedAt: string;
  zoomNickname?: string;
}

interface LessonAccess {
  id: string;
  walletAddress: string;
  lessonId: string;
  courseId: string;
  unlockedAt: string;
  watchProgress: number;
  completed: boolean;
}

export default function CourseDetails() {
  const { courseId } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const { walletAddress, currentLevel, bccBalance } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  // Fetch course details
  const { data: course, isLoading: isLoadingCourse } = useQuery<Course>({
    queryKey: ['/api/education/courses', courseId],
    queryFn: async () => {
      const response = await fetch(`/api/education/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      return response.json();
    },
  });

  // Fetch course lessons (for video courses)
  const { data: lessons, isLoading: isLoadingLessons } = useQuery<CourseLesson[]>({
    queryKey: ['/api/education/courses', courseId, 'lessons'],
    enabled: !!course && course.courseType === 'video',
    queryFn: async () => {
      const response = await fetch(`/api/education/courses/${courseId}/lessons`);
      if (!response.ok) throw new Error('Failed to fetch lessons');
      return response.json();
    },
  });

  // Fetch user's course access
  const { data: courseAccess } = useQuery<CourseAccess>({
    queryKey: ['/api/education/access', courseId],
    enabled: !!walletAddress && !!courseId,
    queryFn: async () => {
      const response = await fetch(`/api/education/access/${courseId}`, {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  // Fetch user's lesson access (for video courses)
  const { data: lessonAccess } = useQuery<LessonAccess[]>({
    queryKey: ['/api/education/lessons/access', courseId],
    enabled: !!walletAddress && !!courseId && course?.courseType === 'video',
    queryFn: async () => {
      const response = await fetch(`/api/education/lessons/access/${courseId}`, {
        headers: {
          'X-Wallet-Address': walletAddress!,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Claim course mutation
  const claimCourseMutation = useMutation({
    mutationFn: async (data: { courseId: string; useBCCBucket: 'transferable' | 'restricted' }) => {
      const response = await fetch('/api/education/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim course');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('education.claim.success.title') || 'Course Claimed!',
        description: t('education.claim.success.description') || 'You now have access to this course.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/education/access', courseId] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setShowClaimDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: t('education.claim.error.title') || 'Claim Failed',
        description: error.message || t('education.claim.error.description') || 'Failed to claim course',
        variant: 'destructive',
      });
    },
  });

  // Unlock lesson mutation  
  const unlockLessonMutation = useMutation({
    mutationFn: async (data: { lessonId: string; useBCCBucket: 'transferable' | 'restricted' }) => {
      const response = await fetch('/api/education/lessons/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Wallet-Address': walletAddress!,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock lesson');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Lesson Unlocked!',
        description: 'You can now access this lesson.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/education/lessons/access', courseId] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Unlock Failed',
        description: error.message || 'Failed to unlock lesson',
        variant: 'destructive',
      });
    },
  });

  const generateZoomNickname = () => {
    const randomNumbers = Math.floor(100 + Math.random() * 900); // 3 random digits
    return `Student${randomNumbers}`;
  };

  const hasAccess = courseAccess !== null && courseAccess !== undefined;
  const canAccess = hasAccess && currentLevel >= (course?.requiredLevel || 1);
  const hasInsufficientBCC = !course?.isFree && (bccBalance?.transferable + bccBalance?.restricted) < (course?.priceBCC || 0);
  const isUnderLevel = currentLevel < (course?.requiredLevel || 1);

  const getLessonAccess = (lessonId: string) => {
    return lessonAccess?.find(access => access.lessonId === lessonId);
  };

  const isLessonUnlocked = (lesson: CourseLesson) => {
    if (lesson.isFree) return true;
    return !!getLessonAccess(lesson.id);
  };

  const getUnlockedLessonsCount = () => {
    if (!lessons) return 0;
    return lessons.filter(lesson => lesson.isFree || isLessonUnlocked(lesson)).length;
  };

  const handleClaimCourse = () => {
    if (!course) return;
    
    const bucketToUse = (bccBalance?.restricted >= course.priceBCC) ? 'restricted' : 'transferable';
    claimCourseMutation.mutate({
      courseId: course.id,
      useBCCBucket: bucketToUse,
    });
  };

  const handleUnlockLesson = (lesson: CourseLesson) => {
    const bucketToUse = (bccBalance?.restricted >= lesson.priceBCC) ? 'restricted' : 'transferable';
    unlockLessonMutation.mutate({
      lessonId: lesson.id,
      useBCCBucket: bucketToUse,
    });
  };

  if (isLoadingCourse) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="fas fa-spinner animate-spin text-honey text-2xl mx-auto mb-4"></i>
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-honey mb-4">Course Not Found</h1>
          <Button onClick={() => setLocation('/education')} variant="outline">
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Education
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation('/education')}
          className="p-0 h-auto text-honey hover:text-honey/80"
        >
          {t('education.title')}
        </Button>
        <i className="fas fa-chevron-right text-xs"></i>
        <span>{course.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Course Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Header */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold text-honey mb-2">
                    {course.title}
                  </CardTitle>
                  <p className="text-muted-foreground mb-4">
                    {course.description}
                  </p>
                  <div className="flex items-center space-x-4 text-sm">
                    <Badge variant="outline" className="border-honey text-honey">
                      <i className={`${course.courseType === 'online' ? 'fas fa-video' : 'fas fa-play-circle'} mr-2`}></i>
                      {course.courseType === 'online' ? t('education.filters.onlineZoom') : t('education.filters.videoLessons')}
                    </Badge>
                    <span className="text-muted-foreground">
                      <i className="fas fa-clock mr-2"></i>
                      {course.duration}
                    </span>
                    <span className="text-muted-foreground">
                      <i className="fas fa-layer-group mr-2"></i>
                      Level {course.requiredLevel}+
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-honey">
                    {course.isFree ? t('education.free') : `${course.priceBCC} BCC`}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Course Access Section */}
          {hasAccess && canAccess && course.courseType === 'online' && (
            <Card className="bg-blue-600/10 border-blue-600/20">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <i className="fas fa-video"></i>
                  {t('education.courseTypes.zoomMeeting')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Meeting ID:</span>
                      <div className="font-mono">{course.zoomMeetingId || 'TBA'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Password:</span>
                      <div className="font-mono">{course.zoomPassword || 'TBA'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Your Zoom Nickname:</span>
                      <div className="font-mono text-honey">
                        {courseAccess?.zoomNickname || generateZoomNickname()}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open(course.zoomLink, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                    disabled={!course.zoomLink}
                  >
                    <i className="fas fa-video mr-2"></i>
                    {t('education.buttons.join')} Zoom Meeting
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Lessons Section */}
          {hasAccess && canAccess && course.courseType === 'video' && lessons && (
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="text-honey flex items-center gap-2">
                  <i className="fas fa-play-circle"></i>
                  Course Lessons ({getUnlockedLessonsCount()}/{lessons.length} unlocked)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lessons
                    .sort((a, b) => a.lessonOrder - b.lessonOrder)
                    .map((lesson, index) => {
                      const access = getLessonAccess(lesson.id);
                      const unlocked = isLessonUnlocked(lesson);
                      
                      return (
                        <div
                          key={lesson.id}
                          className={`p-4 rounded-lg border ${
                            unlocked 
                              ? 'bg-green-500/10 border-green-500/20' 
                              : 'bg-muted/20 border-border'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                  unlocked ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                  {index + 1}
                                </div>
                                <h4 className="font-medium">{lesson.title}</h4>
                                {lesson.isFree && (
                                  <Badge variant="outline" className="border-green-500 text-green-400">
                                    {t('education.free')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {lesson.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  <i className="fas fa-clock mr-1"></i>
                                  {lesson.duration}
                                </span>
                                {access && (
                                  <span>
                                    <i className="fas fa-eye mr-1"></i>
                                    {access.watchProgress}% watched
                                  </span>
                                )}
                              </div>
                              {access && access.watchProgress > 0 && (
                                <Progress value={access.watchProgress} className="mt-2 h-2" />
                              )}
                            </div>
                            <div className="ml-4 flex flex-col gap-2">
                              {unlocked ? (
                                <Button
                                  onClick={() => window.open(lesson.videoUrl, '_blank')}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <i className="fas fa-play mr-2"></i>
                                  {t('education.buttons.watch')}
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleUnlockLesson(lesson)}
                                  size="sm"
                                  disabled={
                                    unlockLessonMutation.isPending ||
                                    (bccBalance?.transferable + bccBalance?.restricted) < lesson.priceBCC
                                  }
                                  className="bg-honey text-black hover:bg-honey/90"
                                >
                                  {unlockLessonMutation.isPending ? (
                                    <>
                                      <i className="fas fa-spinner animate-spin mr-2"></i>
                                      Unlocking...
                                    </>
                                  ) : (
                                    <>
                                      <i className="fas fa-unlock mr-2"></i>
                                      Unlock ({lesson.priceBCC} BCC)
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Course Progress */}
          {hasAccess && (
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="text-honey">Your Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{courseAccess?.progress || 0}%</span>
                    </div>
                    <Progress value={courseAccess?.progress || 0} className="h-2" />
                  </div>
                  {course.courseType === 'video' && lessons && (
                    <div className="text-sm text-muted-foreground">
                      <div>Unlocked: {getUnlockedLessonsCount()}/{lessons.length} lessons</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Claim Course */}
          {!hasAccess && (
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="text-honey">Get Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-honey mb-2">
                      {course.isFree ? 'FREE' : `${course.priceBCC} BCC`}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {course.isFree ? 'This course is completely free!' : 'One-time payment for lifetime access'}
                    </p>
                  </div>

                  <AlertDialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full bg-honey text-black hover:bg-honey/90"
                        disabled={
                          claimCourseMutation.isPending ||
                          isUnderLevel ||
                          hasInsufficientBCC
                        }
                      >
                        {claimCourseMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner animate-spin mr-2"></i>
                            {t('education.buttons.claiming')}
                          </>
                        ) : isUnderLevel ? (
                          `Level ${course.requiredLevel} Required`
                        ) : hasInsufficientBCC ? (
                          t('education.buttons.insufficientBCC')
                        ) : course.isFree ? (
                          t('education.buttons.claimFree')
                        ) : (
                          `Claim for ${course.priceBCC} BCC`
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Course Access</AlertDialogTitle>
                        <AlertDialogDescription>
                          {course.isFree 
                            ? `You are about to claim access to "${course.title}" for free.`
                            : `You are about to claim access to "${course.title}" for ${course.priceBCC} BCC. ${
                                (bccBalance?.restricted >= course.priceBCC) 
                                  ? 'Restricted BCC will be used first.' 
                                  : 'Transferable BCC will be used.'
                              }`
                          }
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClaimCourse}>
                          Confirm Access
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {isUnderLevel && (
                    <p className="text-xs text-red-400 text-center">
                      You need Level {course.requiredLevel} membership to access this course.
                    </p>
                  )}
                  {hasInsufficientBCC && !course.isFree && (
                    <p className="text-xs text-red-400 text-center">
                      Insufficient BCC balance. You need {course.priceBCC} BCC.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Course Info */}
          <Card className="bg-secondary border-border">
            <CardHeader>
              <CardTitle className="text-honey">Course Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{course.courseType === 'online' ? 'Live Online' : 'Self-Paced Video'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{course.duration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Required Level:</span>
                  <span>Level {course.requiredLevel}+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="font-bold text-honey">
                    {course.isFree ? 'FREE' : `${course.priceBCC} BCC`}
                  </span>
                </div>
                {course.courseType === 'video' && lessons && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lessons:</span>
                    <span>{lessons.length} lessons</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}