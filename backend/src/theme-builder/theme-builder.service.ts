import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { TemplateBuilderConfig, TemplateLocation, TemplateModule, TemplateModuleAssignment, TemplatePageConfig } from '../types/template-builder';

@Injectable()
export class ThemeBuilderService {
  private readonly collectionName = 'template_builder_configs';

  /**
   * Get all template builder configurations
   */
  async getAllTemplates(): Promise<TemplateBuilderConfig[]> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not established');

    const collection = db.collection(this.collectionName);
    const templates = await collection.find({}).toArray();
    
    return templates.map(this.mapToTemplateBuilderConfig);
  }

  /**
   * Get a specific template builder configuration
   */
  async getTemplate(templateId: string): Promise<TemplateBuilderConfig> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not established');

    const collection = db.collection(this.collectionName);
    const template = await collection.findOne({ templateId });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return this.mapToTemplateBuilderConfig(template);
  }

  /**
   * Create a new template builder configuration
   */
  async createTemplate(config: Partial<TemplateBuilderConfig>): Promise<TemplateBuilderConfig> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not established');

    const collection = db.collection(this.collectionName);

    const templateId = config.templateId || uuidv4();
    
    // Check if template already exists
    const existing = await collection.findOne({ templateId });
    if (existing) {
      throw new BadRequestException(`Template ${templateId} already exists`);
    }

    const newTemplate: TemplateBuilderConfig = {
      templateId,
      templateName: config.templateName || 'Untitled Template',
      gridRows: config.gridRows,
      gridColumns: config.gridColumns,
      locations: config.locations || [],
      modules: config.modules || [],
      assignments: config.assignments || [],
      pages: config.pages || [],
    };

    await collection.insertOne(newTemplate);
    return newTemplate;
  }

  /**
   * Update a template builder configuration
   */
  async updateTemplate(templateId: string, updates: Partial<TemplateBuilderConfig>): Promise<TemplateBuilderConfig> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not established');

    const collection = db.collection(this.collectionName);
    
    const existing = await collection.findOne({ templateId });
    if (!existing) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      templateId, // Ensure templateId doesn't change
    };

    await collection.updateOne({ templateId }, { $set: updated });
    return this.mapToTemplateBuilderConfig(updated);
  }

  /**
   * Delete a template builder configuration
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection not established');

    const collection = db.collection(this.collectionName);
    
    const result = await collection.deleteOne({ templateId });
    
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return {
      success: true,
      message: `Template ${templateId} deleted successfully`,
    };
  }

  /**
   * Add a location to a template
   */
  async addLocation(templateId: string, location: Omit<TemplateLocation, 'id'>): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    const newLocation: TemplateLocation = {
      id: uuidv4(),
      ...location,
    };

    template.locations.push(newLocation);
    template.locations.sort((a, b) => a.order - b.order);

    return this.updateTemplate(templateId, { locations: template.locations });
  }

  /**
   * Update a location
   */
  async updateLocation(
    templateId: string,
    locationId: string,
    updates: Partial<TemplateLocation>
  ): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    const locationIndex = template.locations.findIndex(l => l.id === locationId);
    if (locationIndex === -1) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    template.locations[locationIndex] = {
      ...template.locations[locationIndex],
      ...updates,
    };

    template.locations.sort((a, b) => a.order - b.order);

    return this.updateTemplate(templateId, { locations: template.locations });
  }

  /**
   * Delete a location
   */
  async deleteLocation(templateId: string, locationId: string): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    // Remove location
    template.locations = template.locations.filter(l => l.id !== locationId);
    
    // Remove all assignments for this location
    template.assignments = template.assignments.filter(a => a.locationId !== locationId);

    return this.updateTemplate(templateId, {
      locations: template.locations,
      assignments: template.assignments,
    });
  }

  /**
   * Add a module to a template
   */
  async addModule(templateId: string, module: Omit<TemplateModule, 'id'>): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    const newModule: TemplateModule = {
      id: uuidv4(),
      ...module,
    };

    template.modules.push(newModule);
    template.modules.sort((a, b) => a.order - b.order);

    return this.updateTemplate(templateId, { modules: template.modules });
  }

  /**
   * Update a module
   */
  async updateModule(
    templateId: string,
    moduleId: string,
    updates: Partial<TemplateModule>
  ): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    const moduleIndex = template.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) {
      throw new NotFoundException(`Module ${moduleId} not found`);
    }

    template.modules[moduleIndex] = {
      ...template.modules[moduleIndex],
      ...updates,
    };

    template.modules.sort((a, b) => a.order - b.order);

    return this.updateTemplate(templateId, { modules: template.modules });
  }

  /**
   * Delete a module
   */
  async deleteModule(templateId: string, moduleId: string): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    // Remove module
    template.modules = template.modules.filter(m => m.id !== moduleId);
    
    // Remove all assignments for this module
    template.assignments = template.assignments.filter(a => a.moduleId !== moduleId);

    return this.updateTemplate(templateId, {
      modules: template.modules,
      assignments: template.assignments,
    });
  }

  /**
   * Assign a module to a location
   */
  async assignModule(templateId: string, assignment: TemplateModuleAssignment): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    // Verify location exists
    const location = template.locations.find(l => l.id === assignment.locationId);
    if (!location) {
      throw new NotFoundException(`Location ${assignment.locationId} not found`);
    }

    // Verify module exists
    const module = template.modules.find(m => m.id === assignment.moduleId);
    if (!module) {
      throw new NotFoundException(`Module ${assignment.moduleId} not found`);
    }

    // Remove existing assignment if it exists
    template.assignments = template.assignments.filter(
      a => !(a.locationId === assignment.locationId && a.moduleId === assignment.moduleId)
    );

    // Add new assignment
    template.assignments.push(assignment);
    
    // Sort assignments by order within each location
    template.assignments.sort((a, b) => {
      if (a.locationId !== b.locationId) {
        return a.locationId.localeCompare(b.locationId);
      }
      return a.order - b.order;
    });

    return this.updateTemplate(templateId, { assignments: template.assignments });
  }

  /**
   * Remove a module assignment
   */
  async unassignModule(
    templateId: string,
    locationId: string,
    moduleId: string
  ): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    template.assignments = template.assignments.filter(
      a => !(a.locationId === locationId && a.moduleId === moduleId)
    );

    return this.updateTemplate(templateId, { assignments: template.assignments });
  }

  /**
   * Update assignment order
   */
  async updateAssignmentOrder(
    templateId: string,
    locationId: string,
    moduleId: string,
    order: number
  ): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    const assignment = template.assignments.find(
      a => a.locationId === locationId && a.moduleId === moduleId
    );

    if (!assignment) {
      throw new NotFoundException(`Assignment not found`);
    }

    assignment.order = order;
    
    // Sort assignments by order within each location
    template.assignments.sort((a, b) => {
      if (a.locationId !== b.locationId) {
        return a.locationId.localeCompare(b.locationId);
      }
      return a.order - b.order;
    });

    return this.updateTemplate(templateId, { assignments: template.assignments });
  }

  /**
   * Add a page to a template
   */
  async addPage(templateId: string, page: Omit<TemplatePageConfig, 'id'>): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    const newPage: TemplatePageConfig = {
      id: uuidv4(),
      ...page,
    };

    if (!template.pages) {
      template.pages = [];
    }
    template.pages.push(newPage);

    return this.updateTemplate(templateId, { pages: template.pages });
  }

  /**
   * Delete a page
   */
  async deletePage(templateId: string, pageId: string): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    if (!template.pages) {
      template.pages = [];
    }
    template.pages = template.pages.filter(p => p.id !== pageId);

    return this.updateTemplate(templateId, { pages: template.pages });
  }

  /**
   * Assign a module to a location for a specific page
   */
  async assignModuleToPage(
    templateId: string,
    pageId: string,
    assignment: TemplateModuleAssignment
  ): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    const page = template.pages?.find(p => p.id === pageId);
    if (!page) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    // Verify location exists
    const location = template.locations.find(l => l.id === assignment.locationId);
    if (!location) {
      throw new NotFoundException(`Location ${assignment.locationId} not found`);
    }

    // Verify module exists
    const module = template.modules.find(m => m.id === assignment.moduleId);
    if (!module) {
      throw new NotFoundException(`Module ${assignment.moduleId} not found`);
    }

    // Remove existing assignment if it exists
    if (!page.moduleAssignments) {
      page.moduleAssignments = [];
    }
    page.moduleAssignments = page.moduleAssignments.filter(
      a => !(a.locationId === assignment.locationId && a.moduleId === assignment.moduleId)
    );

    // Add new assignment
    page.moduleAssignments.push(assignment);
    
    // Sort assignments by order within each location
    page.moduleAssignments.sort((a, b) => {
      if (a.locationId !== b.locationId) {
        return a.locationId.localeCompare(b.locationId);
      }
      return a.order - b.order;
    });

    return this.updateTemplate(templateId, { pages: template.pages });
  }

  /**
   * Remove a module assignment from a page
   */
  async unassignModuleFromPage(
    templateId: string,
    pageId: string,
    locationId: string,
    moduleId: string
  ): Promise<TemplateBuilderConfig> {
    const template = await this.getTemplate(templateId);
    
    const page = template.pages?.find(p => p.id === pageId);
    if (!page) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    if (!page.moduleAssignments) {
      page.moduleAssignments = [];
    }
    page.moduleAssignments = page.moduleAssignments.filter(
      a => !(a.locationId === locationId && a.moduleId === moduleId)
    );

    return this.updateTemplate(templateId, { pages: template.pages });
  }

  /**
   * Map database document to TemplateBuilderConfig
   */
  private mapToTemplateBuilderConfig(doc: any): TemplateBuilderConfig {
    return {
      templateId: doc.templateId,
      templateName: doc.templateName,
      gridRows: doc.gridRows,
      gridColumns: doc.gridColumns,
      locations: doc.locations || [],
      modules: doc.modules || [],
      assignments: doc.assignments || [],
      pages: doc.pages || [],
    };
  }
}
