import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import HexagonIcon from '../components/shared/HexagonIcon';
import UserProfile from '../components/shared/UserProfile';
import { coursesApi } from '../api/education/courses.api';
import { useState, useMemo } from 'react';
import { Progress } from '../components/ui/progress';
import styles from '../styles/education/education.module.css';

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

interface CourseAccess {
  id: string;
  walletAddress: string;
  courseId: string;
  progress: number;
  completed: boolean;
  grantedAt: string;
}

export default function Education() {
  const { walletAddress, currentLevel, bccBalance } = useWallet();
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Fetch courses
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['/api/courses'],
    queryFn: coursesApi.getCourses
  });

  // Fetch user's course access
  const { data: courseAccess = [], isLoading: isLoadingAccess } = useQuery({
    queryKey: ['/api/course-access', walletAddress],
    queryFn: () => coursesApi.getCourseAccess(walletAddress!),
    enabled: !!walletAddress
  });

  // Purchase course mutation
  const purchaseCourseMutation = useMutation({
    mutationFn: ({ courseId, bccAmount }: { courseId: string; bccAmount: number }) =>
      coursesApi.purchaseCourse(courseId, bccAmount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/course-access'] });
      toast({
        title: t('education.purchaseSuccess'),
        description: t('education.purchaseSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('education.purchaseError'),
        description: t('education.purchaseErrorDesc'),
        variant: 'destructive',
      });
    }
  });

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = filterLevel === 'all' || course.requiredLevel <= parseInt(filterLevel);
      return matchesSearch && matchesLevel;
    });
  }, [courses, searchTerm, filterLevel]);

  const hasAccess = (courseId: string) => {
    return courseAccess.some(access => access.courseId === courseId);
  };

  const getProgress = (courseId: string) => {
    const access = courseAccess.find(access => access.courseId === courseId);
    return access?.progress || 0;
  };

  const handlePurchaseCourse = (course: Course) => {
    if (currentLevel < course.requiredLevel) {
      toast({
        title: t('education.levelRequired'),
        description: t('education.levelRequiredDesc', { level: course.requiredLevel }),
        variant: 'destructive',
      });
      return;
    }

    if (!course.isFree && (bccBalance?.transferable || 0) < course.priceBCC) {
      toast({
        title: t('education.insufficientBalance'),
        description: t('education.insufficientBalanceDesc'),
        variant: 'destructive',
      });
      return;
    }

    purchaseCourseMutation.mutate({
      courseId: course.id,
      bccAmount: course.priceBCC
    });
  };

  return (
    <div className={`${styles.educationContainer} container mx-auto px-4 py-8`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-honey mb-2">
            {t('education.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('education.subtitle')}
          </p>
        </div>
        <UserProfile />
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder={t('education.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary border-border"
          />
        </div>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-48 bg-secondary border-border">
            <SelectValue placeholder={t('education.filterByLevel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('education.allLevels')}</SelectItem>
            <SelectItem value="1">{t('education.level')} 1+</SelectItem>
            <SelectItem value="3">{t('education.level')} 3+</SelectItem>
            <SelectItem value="5">{t('education.level')} 5+</SelectItem>
            <SelectItem value="10">{t('education.level')} 10+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses Grid */}
      {isLoadingCourses ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-honey mx-auto"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const hasUserAccess = hasAccess(course.id);
            const progress = getProgress(course.id);
            const canAccess = currentLevel >= course.requiredLevel;

            return (
              <Card key={course.id} className="bg-secondary border-border hover:border-honey/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-honey mb-1">{course.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                    <HexagonIcon className="w-8 h-8 text-honey/70 flex-shrink-0 ml-2" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('education.duration')}</span>
                    <span>{course.duration}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant={canAccess ? 'default' : 'destructive'}>
                      {t('education.level')} {course.requiredLevel}+
                    </Badge>
                    {!course.isFree && (
                      <Badge variant="outline" className="text-honey border-honey">
                        {course.priceBCC} BCC
                      </Badge>
                    )}
                  </div>

                  {hasUserAccess && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t('education.progress')}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  <div className="pt-2">
                    {hasUserAccess ? (
                      <Button 
                        className="w-full bg-honey text-secondary hover:bg-honey/90"
                        onClick={() => setSelectedCourse(course)}
                      >
                        {progress === 100 ? t('education.review') : t('education.continue')}
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-honey text-secondary hover:bg-honey/90"
                        onClick={() => handlePurchaseCourse(course)}
                        disabled={!canAccess || (!course.isFree && (bccBalance?.transferable || 0) < course.priceBCC)}
                      >
                        {course.isFree ? t('education.enroll') : t('education.purchase')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredCourses.length === 0 && !isLoadingCourses && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('education.noCourses')}</p>
        </div>
      )}
    </div>
  );
}