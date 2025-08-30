import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export default function Learn() {
  const { userData, currentLevel } = useWallet();
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  // Fetch user's course progress
  const { data: userProgress = [], isLoading: isProgressLoading } = useQuery<any[]>({
    queryKey: ['/api/education/progress'],
    queryFn: async () => {
      if (!userData?.user?.walletAddress) throw new Error('No wallet address');
      const response = await fetch('/api/education/progress', {
        headers: {
          'X-Wallet-Address': userData.user.walletAddress,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json();
    },
    enabled: !!userData?.user?.walletAddress
  });

  // Fetch all available courses
  const { data: allCourses = [], isLoading: isCoursesLoading } = useQuery<any[]>({
    queryKey: ['/api/education/courses'],
    queryFn: async () => {
      const response = await fetch('/api/education/courses');
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    }
  });

  // Calculate progress statistics
  const progressStats = {
    completedCourses: userProgress.filter((access: any) => access.completed).length,
    totalCourses: allCourses.length,
    enrolledCourses: userProgress.length,
    certificates: userProgress.filter((access: any) => access.completed).length,
    studyHours: userProgress.filter((access: any) => access.completed).length * 4, // Estimate 4 hours per course
    averageProgress: userProgress.length > 0 
      ? Math.round(userProgress.reduce((sum: number, access: any) => sum + access.progress, 0) / userProgress.length)
      : 0
  };

  // Get recent courses (last 3 enrolled/completed)
  const recentCourses = userProgress
    .sort((a: any, b: any) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime())
    .slice(0, 3)
    .map((access: any) => {
      const course = allCourses.find((c: any) => c.id === access.courseId);
      return {
        id: access.courseId,
        name: course?.title || 'Unknown Course',
        progress: access.progress,
        completed: access.completed,
        date: new Date(access.grantedAt).toLocaleDateString()
      };
    });

  // Find next recommended course (not enrolled, meets level requirement)
  const nextRecommendedCourse = allCourses.find((course: any) => {
    const isEnrolled = userProgress.some((access: any) => access.courseId === course.id);
    const meetsLevel = currentLevel >= course.requiredLevel;
    return !isEnrolled && meetsLevel;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Learning Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-graduation-cap text-honey text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isProgressLoading ? '...' : progressStats.completedCourses}</div>
            <div className="text-muted-foreground text-sm">{t('me.learning.coursesCompleted')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-clock text-blue-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isProgressLoading ? '...' : progressStats.studyHours}</div>
            <div className="text-muted-foreground text-sm">{t('me.learning.studyHours')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-certificate text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{isProgressLoading ? '...' : progressStats.certificates}</div>
            <div className="text-muted-foreground text-sm">{t('me.learning.certificates')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-chart-line text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">
              {isProgressLoading || isCoursesLoading ? '...' : 
                progressStats.totalCourses > 0 ? Math.round((progressStats.completedCourses / progressStats.totalCourses) * 100) : 0
              }%
            </div>
            <div className="text-muted-foreground text-sm">Overall Progress</div>
          </CardContent>
        </Card>
      </div>

      {/* Current Progress */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Learning Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t('me.learning.coursesCompleted')}</span>
              <span className="text-honey">
                {isProgressLoading || isCoursesLoading ? '...' : `${progressStats.completedCourses} / ${progressStats.totalCourses}`}
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progressStats.totalCourses > 0 ? (progressStats.completedCourses / progressStats.totalCourses) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t('me.learning.studyHours')}</span>
              <span className="text-honey">{isProgressLoading ? '...' : progressStats.studyHours} hours</span>
            </div>
            <div className="progress-bar">
              <div className="bg-blue-400 h-2 rounded-full" style={{ width: '70%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Recommended Course */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Next Recommended Course</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-honey/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-play text-honey"></i>
              </div>
              <div>
                <h3 className="font-semibold text-honey">
                  {isCoursesLoading ? 'Loading...' : (nextRecommendedCourse?.title || 'No recommendations available')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {nextRecommendedCourse ? `Estimated ${nextRecommendedCourse.duration} • Level ${nextRecommendedCourse.requiredLevel}+ Required` : 'Complete current courses to unlock more'}
                </p>
              </div>
            </div>
            <Button 
              className="btn-honey" 
              data-testid="button-start-course"
              disabled={!nextRecommendedCourse}
              onClick={() => nextRecommendedCourse && setLocation('/education')}
            >
              {nextRecommendedCourse ? 'Browse Courses' : 'No Courses Available'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Courses */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-honey">Recent Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isProgressLoading ? (
              <div className="flex justify-center py-4">
                <div className="text-muted-foreground">Loading recent courses...</div>
              </div>
            ) : recentCourses.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No courses enrolled yet
              </div>
            ) : (
              recentCourses.map((course: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-book text-honey text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-honey">{course.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {course.completed ? 'Completed' : `${course.progress}% Complete`} • {course.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {course.completed ? (
                    <Badge className="bg-green-600 text-white">
                      <i className="fas fa-check mr-1"></i>
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {course.progress}%
                    </Badge>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    data-testid={`button-continue-course-${index}`}
                    onClick={() => setLocation('/education')}
                  >
                    <i className="fas fa-arrow-right"></i>
                  </Button>
                </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}