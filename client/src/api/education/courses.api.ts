// Education API functions
export const coursesApi = {
  async getCourses() {
    const response = await fetch('/api/courses');
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  },

  async getCourseAccess(walletAddress: string) {
    const response = await fetch(`/api/course-access/${walletAddress}`);
    if (!response.ok) throw new Error('Failed to fetch course access');
    return response.json();
  },

  async purchaseCourse(courseId: string, bccAmount: number) {
    const response = await fetch('/api/purchase-course', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, bccAmount })
    });
    if (!response.ok) throw new Error('Failed to purchase course');
    return response.json();
  },

  async updateProgress(courseId: string, progress: number) {
    const response = await fetch('/api/course-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, progress })
    });
    if (!response.ok) throw new Error('Failed to update progress');
    return response.json();
  }
};