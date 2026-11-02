import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get sessions for the authenticated user', async () => {
    const mockService = (controller as any).authService;
    mockService.getSessions = jest.fn().mockResolvedValue({
      items: [{ id: 's1', isCurrent: true }],
      count: 1,
    });

    const req = {
      user: { id: 'u1' },
      headers: { cookie: 'session=tok' },
    } as any;

    const res = await controller.getSessions(req);
    expect(res).toEqual({ items: [{ id: 's1', isCurrent: true }], count: 1 });
    expect(mockService.getSessions).toHaveBeenCalledWith('u1', 'session=tok', undefined, undefined);
  });

  it('should revoke a session and clear cookie if it is current', async () => {
    const mockService = (controller as any).authService;
    mockService.revokeSession = jest.fn().mockResolvedValue({
      revoked: true,
      isCurrent: true,
    });

    const req = {
      user: { id: 'u1' },
      headers: { cookie: 'session=tok' },
    } as any;

    const resObj = {
      clearCookie: jest.fn(),
    } as any;

    const res = await controller.revokeSession('s1', req, resObj);
    expect(res).toEqual({ item: { revoked: true, isCurrent: true } });
    expect(resObj.clearCookie).toHaveBeenCalled();
  });

  it('should revoke other sessions', async () => {
    const mockService = (controller as any).authService;
    mockService.revokeOtherSessions = jest.fn().mockResolvedValue({
      revokedCount: 2,
    });

    const req = {
      user: { id: 'u1' },
      headers: { cookie: 'session=tok' },
    } as any;

    const res = await controller.revokeOtherSessions(req);
    expect(res).toEqual({ item: { revokedCount: 2 } });
  });
});
