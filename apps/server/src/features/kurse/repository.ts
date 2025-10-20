import { Course, CourseCreateInput, PaginatedResult, PaginationQuery } from '../../../../../packages/domain';

let sequence = 0;
const generateId = () => {
  sequence += 1;
  return `course_${sequence}`;
};

export class KurseRepository {
  private readonly courses = new Map<string, Course>();

  async findAll({ page = 1, pageSize = 50 }: PaginationQuery = {}): Promise<PaginatedResult<Course>> {
    const values = Array.from(this.courses.values());
    const start = (page - 1) * pageSize;
    const data = values.slice(start, start + pageSize);
    return {
      data,
      total: values.length,
      page,
      pageSize,
    };
  }

  async findById(id: string): Promise<Course | undefined> {
    return this.courses.get(id);
  }

  async create(payload: CourseCreateInput): Promise<Course> {
    const now = new Date().toISOString();
    const course: Course = {
      id: generateId(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };
    this.courses.set(course.id, course);
    return course;
  }

  async update(id: string, payload: Partial<CourseCreateInput>): Promise<Course | undefined> {
    const existing = this.courses.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Course = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    this.courses.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.courses.delete(id);
  }
}
