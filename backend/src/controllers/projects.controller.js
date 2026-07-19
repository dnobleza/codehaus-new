const logger = require('../utils/logger');
const { toHttpError } = require('../utils/httpError');
const { createProjectSchema } = require('../validators/projects.validator');
const { listActivityQuerySchema } = require('../validators/activity.validator');
const projectsService = require('../services/projects.service');
const projectOverviewService = require('../services/projectOverview.service');
const TAG = '[PROJECTS-CONTROLLER]';

exports.create = async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await projectsService.createProject({
      clientId: req.user.id,
      title: data.title,
      requestDetails: data.requestDetails,
      packageId: data.packageId ?? null,
    });
    logger.info(`${TAG} Project ${project.id} created for client ${req.user.id}`);
    res.status(201).json({ success: true, message: 'Project request submitted successfully', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.list = async (req, res, next) => {
  try {
    const projects = await projectsService.listProjectsForClient(req.user.id, { statusCode: req.query.status_code });
    logger.info(`${TAG} Listed ${projects.length} projects for client ${req.user.id}`);
    res.status(200).json({ success: true, message: 'Projects retrieved successfully', data: projects });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await projectsService.getProjectForClient(req.params.id, req.user.id);
    logger.info(`${TAG} Project ${req.params.id} retrieved for client ${req.user.id}`);
    res.status(200).json({ success: true, message: 'Project retrieved successfully', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getOverview = async (req, res, next) => {
  try {
    const overview = await projectOverviewService.getOverviewForClient(req.params.id, req.user.id);
    logger.info(`${TAG} Overview retrieved for project ${req.params.id} (client ${req.user.id})`);
    res.status(200).json({ success: true, message: 'Project overview retrieved successfully', data: overview });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getActivity = async (req, res, next) => {
  try {
    const query = listActivityQuerySchema.parse(req.query);
    const activity = await projectOverviewService.getActivityForClient(req.params.id, req.user.id, query);
    logger.info(`${TAG} Activity feed retrieved for project ${req.params.id} (client ${req.user.id})`);
    res.status(200).json({ success: true, message: 'Project activity retrieved successfully', data: activity });
  } catch (error) {
    next(toHttpError(error));
  }
};
