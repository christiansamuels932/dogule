import { Course, CourseCreateInput, PaginatedResult, PaginationQuery } from '@dogule/domain';
import { KurseRepository } from './repository';

export class KurseService {
  constructor(private readonly repository = new KurseRepository()) {}

  list(query?: PaginationQuery): Promise<PaginatedResult<Course>> {
    return this.repository.findAll(query);
  }

  get(id: string): Promise<Course | undefined> {
    return this.repository.findById(id);
  }

  create(payload: CourseCreateInput): Promise<Course> {
    return this.repository.create(payload);
  }

  update(id: string, payload: Partial<CourseCreateInput>): Promise<Course | undefined> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}
