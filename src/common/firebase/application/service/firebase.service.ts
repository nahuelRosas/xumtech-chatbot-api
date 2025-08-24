import { Injectable } from '@nestjs/common';

@Injectable()
export class FirebaseService {
  private projects: Record<string, string> = {};

  public addProject(projectId: string, name: string): void {
    this.projects[projectId] = name.toUpperCase();
  }

  public getProjectName(projectId: string): string | undefined {
    return this.projects[projectId];
  }

  public getAllProjects(): Record<string, string> {
    return this.projects;
  }
}
