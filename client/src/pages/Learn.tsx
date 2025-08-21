import { useWallet } from '../hooks/useWallet';
import { useI18n } from '../contexts/I18nContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Learn() {
  const { userData } = useWallet();
  const { t } = useI18n();

  const mockProgressData = {
    completedCourses: 5,
    totalCourses: 12,
    studyHours: 28,
    certificates: 3,
    nextCourse: 'Advanced DeFi Strategies',
    recentCourses: [
      { name: 'Blockchain Fundamentals', progress: 100, date: '2024-10-15' },
      { name: 'Smart Contract Basics', progress: 85, date: '2024-10-12' },
      { name: 'DeFi Introduction', progress: 60, date: '2024-10-08' }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Learning Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-graduation-cap text-honey text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{mockProgressData.completedCourses}</div>
            <div className="text-muted-foreground text-sm">{t('me.learning.coursesCompleted')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-clock text-blue-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{mockProgressData.studyHours}</div>
            <div className="text-muted-foreground text-sm">{t('me.learning.studyHours')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-certificate text-green-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{mockProgressData.certificates}</div>
            <div className="text-muted-foreground text-sm">{t('me.learning.certificates')}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-border text-center">
          <CardContent className="p-6">
            <i className="fas fa-chart-line text-purple-400 text-2xl mb-3"></i>
            <div className="text-2xl font-bold text-honey">{Math.round((mockProgressData.completedCourses / mockProgressData.totalCourses) * 100)}%</div>
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
              <span className="text-honey">{mockProgressData.completedCourses} / {mockProgressData.totalCourses}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(mockProgressData.completedCourses / mockProgressData.totalCourses) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">{t('me.learning.studyHours')}</span>
              <span className="text-honey">{mockProgressData.studyHours} hours</span>
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
                <h3 className="font-semibold text-honey">{mockProgressData.nextCourse}</h3>
                <p className="text-sm text-muted-foreground">Estimated 4 hours • Level 3+ Required</p>
              </div>
            </div>
            <Button className="btn-honey" data-testid="button-start-course">
              Start Course
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
            {mockProgressData.recentCourses.map((course, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-honey/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-book text-honey text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-honey">{course.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {course.progress === 100 ? 'Completed' : `${course.progress}% Complete`} • {course.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {course.progress === 100 ? (
                    <Badge className="bg-green-600 text-white">
                      <i className="fas fa-check mr-1"></i>
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {course.progress}%
                    </Badge>
                  )}
                  <Button size="sm" variant="ghost" data-testid={`button-continue-course-${index}`}>
                    <i className="fas fa-arrow-right"></i>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}