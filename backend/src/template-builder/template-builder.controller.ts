import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { TemplateBuilderService } from './template-builder.service';
import type { TemplateBuilderConfig, TemplateLocation, TemplateModule, TemplateModuleAssignment, TemplatePageConfig } from '../types/template-builder';

@Controller('admin/template-builder')
@UseGuards(AdminGuard)
export class TemplateBuilderController {
  constructor(private readonly templateBuilderService: TemplateBuilderService) {}

  /**
   * Get all template builder configurations
   * Path: GET /api/admin/template-builder
   */
  @Get()
  async getTemplates(): Promise<TemplateBuilderConfig[]> {
    return this.templateBuilderService.getAllTemplates();
  }

  /**
   * Get a specific template builder configuration
   * Path: GET /api/admin/template-builder/:templateId
   */
  @Get(':templateId')
  async getTemplate(@Param('templateId') templateId: string): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.getTemplate(templateId);
  }

  /**
   * Create a new template builder configuration
   * Path: POST /api/admin/template-builder
   */
  @Post()
  async createTemplate(@Body() config: Partial<TemplateBuilderConfig>): Promise<TemplateBuilderConfig> {
    if (!config.templateName) {
      throw new BadRequestException('Template name is required');
    }
    return this.templateBuilderService.createTemplate(config);
  }

  /**
   * Update a template builder configuration
   * Path: PUT /api/admin/template-builder/:templateId
   */
  @Put(':templateId')
  async updateTemplate(
    @Param('templateId') templateId: string,
    @Body() config: Partial<TemplateBuilderConfig>
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.updateTemplate(templateId, config);
  }

  /**
   * Delete a template builder configuration
   * Path: DELETE /api/admin/template-builder/:templateId
   */
  @Delete(':templateId')
  async deleteTemplate(@Param('templateId') templateId: string): Promise<{ success: boolean; message: string }> {
    return this.templateBuilderService.deleteTemplate(templateId);
  }

  /**
   * Add a location to a template
   * Path: POST /api/admin/template-builder/:templateId/locations
   */
  @Post(':templateId/locations')
  async addLocation(
    @Param('templateId') templateId: string,
    @Body() location: Omit<TemplateLocation, 'id'>
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.addLocation(templateId, location);
  }

  /**
   * Update a location
   * Path: PUT /api/admin/template-builder/:templateId/locations/:locationId
   */
  @Put(':templateId/locations/:locationId')
  async updateLocation(
    @Param('templateId') templateId: string,
    @Param('locationId') locationId: string,
    @Body() updates: Partial<TemplateLocation>
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.updateLocation(templateId, locationId, updates);
  }

  /**
   * Delete a location
   * Path: DELETE /api/admin/template-builder/:templateId/locations/:locationId
   */
  @Delete(':templateId/locations/:locationId')
  async deleteLocation(
    @Param('templateId') templateId: string,
    @Param('locationId') locationId: string
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.deleteLocation(templateId, locationId);
  }

  /**
   * Add a module to a template
   * Path: POST /api/admin/template-builder/:templateId/modules
   */
  @Post(':templateId/modules')
  async addModule(
    @Param('templateId') templateId: string,
    @Body() module: Omit<TemplateModule, 'id'>
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.addModule(templateId, module);
  }

  /**
   * Update a module
   * Path: PUT /api/admin/template-builder/:templateId/modules/:moduleId
   */
  @Put(':templateId/modules/:moduleId')
  async updateModule(
    @Param('templateId') templateId: string,
    @Param('moduleId') moduleId: string,
    @Body() updates: Partial<TemplateModule>
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.updateModule(templateId, moduleId, updates);
  }

  /**
   * Delete a module
   * Path: DELETE /api/admin/template-builder/:templateId/modules/:moduleId
   */
  @Delete(':templateId/modules/:moduleId')
  async deleteModule(
    @Param('templateId') templateId: string,
    @Param('moduleId') moduleId: string
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.deleteModule(templateId, moduleId);
  }

  /**
   * Assign a module to a location
   * Path: POST /api/admin/template-builder/:templateId/assignments
   */
  @Post(':templateId/assignments')
  async assignModule(
    @Param('templateId') templateId: string,
    @Body() assignment: TemplateModuleAssignment
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.assignModule(templateId, assignment);
  }

  /**
   * Remove a module assignment
   * Path: DELETE /api/admin/template-builder/:templateId/assignments/:locationId/:moduleId
   */
  @Delete(':templateId/assignments/:locationId/:moduleId')
  async unassignModule(
    @Param('templateId') templateId: string,
    @Param('locationId') locationId: string,
    @Param('moduleId') moduleId: string
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.unassignModule(templateId, locationId, moduleId);
  }

  /**
   * Update assignment order
   * Path: PUT /api/admin/template-builder/:templateId/assignments/:locationId/:moduleId
   */
  @Put(':templateId/assignments/:locationId/:moduleId')
  async updateAssignmentOrder(
    @Param('templateId') templateId: string,
    @Param('locationId') locationId: string,
    @Param('moduleId') moduleId: string,
    @Body() body: { order: number }
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.updateAssignmentOrder(templateId, locationId, moduleId, body.order);
  }

  /**
   * Assign a module to a location for a specific page
   * Path: POST /api/admin/template-builder/:templateId/pages/:pageId/assignments
   */
  @Post(':templateId/pages/:pageId/assignments')
  async assignModuleToPage(
    @Param('templateId') templateId: string,
    @Param('pageId') pageId: string,
    @Body() assignment: TemplateModuleAssignment
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.assignModuleToPage(templateId, pageId, assignment);
  }

  /**
   * Remove a module assignment from a page
   * Path: DELETE /api/admin/template-builder/:templateId/pages/:pageId/assignments/:locationId/:moduleId
   */
  @Delete(':templateId/pages/:pageId/assignments/:locationId/:moduleId')
  async unassignModuleFromPage(
    @Param('templateId') templateId: string,
    @Param('pageId') pageId: string,
    @Param('locationId') locationId: string,
    @Param('moduleId') moduleId: string
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.unassignModuleFromPage(templateId, pageId, locationId, moduleId);
  }

  /**
   * Add a page to a template
   * Path: POST /api/admin/template-builder/:templateId/pages
   */
  @Post(':templateId/pages')
  async addPage(
    @Param('templateId') templateId: string,
    @Body() page: Omit<TemplatePageConfig, 'id'>
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.addPage(templateId, page);
  }

  /**
   * Delete a page
   * Path: DELETE /api/admin/template-builder/:templateId/pages/:pageId
   */
  @Delete(':templateId/pages/:pageId')
  async deletePage(
    @Param('templateId') templateId: string,
    @Param('pageId') pageId: string
  ): Promise<TemplateBuilderConfig> {
    return this.templateBuilderService.deletePage(templateId, pageId);
  }
}
