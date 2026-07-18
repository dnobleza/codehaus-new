const { toHttpError } = require('../utils/httpError');
const { createProjectSchema } = require('../validators/projects.validator');
const projectsService = require('../services/projects.service');

exports.create = async (req, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await projectsService.createProject({
      clientId: req.user.id,
      title: data.title,
      requestDetails: data.requestDetails,
      packageId: data.packageId ?? null,
    });
    res.status(201).json({ success: true, message: 'Project request submitted successfully', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.list = async (req, res, next) => {
  try {
    const projects = await projectsService.listProjectsForClient(req.user.id, { statusCode: req.query.status_code });
    res.status(200).json({ success: true, message: 'Projects retrieved successfully', data: projects });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.getById = async (req, res, next) => {
  try {
    const project = await projectsService.getProjectForClient(req.params.id, req.user.id);
    res.status(200).json({ success: true, message: 'Project retrieved successfully', data: project });
  } catch (error) {
    next(toHttpError(error));
  }
};
