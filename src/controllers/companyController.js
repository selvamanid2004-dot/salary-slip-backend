/**
 * @file companyController.js
 * @description Controller handling Company Profile and Letterhead configuration endpoints.
 */

const CompanyModel = require('../models/Company');
const logger = require('../utils/logger');

/**
 * GET /api/company
 * Retrieves company profile
 */
const getCompany = async (req, res, next) => {
  try {
    const company = await CompanyModel.get();
    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/company
 * Updates company profile
 */
const updateCompany = async (req, res, next) => {
  try {
    const updated = await CompanyModel.update(req.body);
    logger.info(`[Company] Profile updated: ${updated.company_name}`);
    res.json({
      success: true,
      message: 'Company profile updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompany,
  updateCompany
};
