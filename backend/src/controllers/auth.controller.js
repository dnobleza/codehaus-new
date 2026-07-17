const logger = require('../utils/logger');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const authService = require('../services/auth.service');
const TAG = '[AUTH-CONTROLLER]';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/auth',
};

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken.rawToken, {
    ...REFRESH_COOKIE_OPTIONS,
    expires: refreshToken.expiresAt,
  });
}

function toHttpError(error) {
  if (error.name === 'ZodError') {
    const message = error.issues.map((issue) => issue.message).join(', ');
    const httpError = new Error(message);
    httpError.statusCode = 400;
    return httpError;
  }
  return error;
}

exports.register = async (req, res, next) => {
  try {
    const { firstName, middleName, lastName, email, password, contactNo, address } = registerSchema.parse(
      req.body
    );
    const { user, accessToken, refreshToken } = await authService.registerUser({
      firstName,
      middleName,
      lastName,
      email,
      password,
      contactNo,
      address,
    });

    setRefreshCookie(res, refreshToken);
    logger.info(`${TAG} Registration succeeded for ${user.id}`);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, accessToken },
    });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken } = await authService.loginUser({ email, password });

    setRefreshCookie(res, refreshToken);
    logger.info(`${TAG} Login succeeded for ${user.id}`);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user, accessToken },
    });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const { user, accessToken, refreshToken } = await authService.refreshSession(rawRefreshToken);

    setRefreshCookie(res, refreshToken);
    logger.info(`${TAG} Token refreshed for ${user.id}`);
    res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: { user, accessToken },
    });
  } catch (error) {
    next(toHttpError(error));
  }
};

exports.logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(rawRefreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);
    logger.info(`${TAG} Logout succeeded`);
    res.status(200).json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(toHttpError(error));
  }
};
