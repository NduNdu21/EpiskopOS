const jwt = require('jsonwebtoken');
const authMiddleware = require('./authMiddleware');

jest.mock('jsonwebtoken');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authMiddleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  test('rejects request with no Authorization header', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects a malformed Authorization header', () => {
    const req = { headers: { authorization: 'Token abc123' } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects an invalid/expired token', () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });
    const req = { headers: { authorization: 'Bearer badtoken' } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches decoded user and calls next() on valid token', () => {
    jwt.verify.mockReturnValue({ id: 'user-1', role: 'admin' });
    const req = { headers: { authorization: 'Bearer goodtoken' } };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(req.user).toEqual({ id: 'user-1', role: 'admin' });
    expect(next).toHaveBeenCalled();
  });
});