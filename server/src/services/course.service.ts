import { 
  courses,
  courseActivations,
  type Course,
  type InsertCourse,
  type CourseActivation,
  type InsertCourseActivation
} from "@shared/schema";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";

export class CourseService {
  // Course operations - integrated with lessons
  async getCourses(): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .orderBy(courses.createdAt);
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id));
    return course || undefined;
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const [newCourse] = await db
      .insert(courses)
      .values(course)
      .returning();
    return newCourse;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course | undefined> {
    const [updatedCourse] = await db
      .update(courses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(courses.id, id))
      .returning();
    return updatedCourse || undefined;
  }

  // Course Activation operations - replaces CourseAccess and LessonAccess
  async getCourseActivation(walletAddress: string, courseId: string): Promise<CourseActivation | undefined> {
    const [activation] = await db
      .select()
      .from(courseActivations)
      .where(and(
        eq(courseActivations.walletAddress, walletAddress),
        eq(courseActivations.courseId, courseId)
      ));
    return activation || undefined;
  }

  async getCourseActivationsByWallet(walletAddress: string): Promise<CourseActivation[]> {
    return await db
      .select()
      .from(courseActivations)
      .where(eq(courseActivations.walletAddress, walletAddress))
      .orderBy(courseActivations.activatedAt);
  }

  async createCourseActivation(activation: InsertCourseActivation): Promise<CourseActivation> {
    const [newActivation] = await db
      .insert(courseActivations)
      .values(activation)
      .returning();
    return newActivation;
  }

  async updateCourseActivation(
    walletAddress: string, 
    courseId: string, 
    updates: Partial<CourseActivation>
  ): Promise<CourseActivation | undefined> {
    const [updatedActivation] = await db
      .update(courseActivations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(courseActivations.walletAddress, walletAddress),
        eq(courseActivations.courseId, courseId)
      ))
      .returning();
    return updatedActivation || undefined;
  }

  // Check if user has access to course based on their membership level
  async hasAccessToCourse(walletAddress: string, courseId: string, memberLevel: number): Promise<boolean> {
    const course = await this.getCourse(courseId);
    if (!course) return false;

    // Check if user has high enough level
    if (memberLevel < course.requiredLevel) return false;

    // Check if course is activated for this user
    const activation = await this.getCourseActivation(walletAddress, courseId);
    return activation?.isActive === true;
  }
}

export const courseService = new CourseService();