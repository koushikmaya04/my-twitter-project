import { jest } from '@jest/globals';
import { SessionGuard } from '../auth/session.guard';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersService = {
    updateProfile: jest.fn(),
    getUserById: jest.fn(),
    listProfileMedia: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    
const module: TestingModule = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [
    {
      provide: UsersService,
      useValue: usersService,
    },
  ],
})
  .overrideGuard(SessionGuard)
  .useValue({ canActivate: () => true })
  .compile();


    controller = module.get<UsersController>(UsersController);
  });

  describe('updateMyProfile', () => {
    const request = {
      user: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        handle: 'testuser',
        displayName: 'Test User',
        createdAt: new Date(),
      },
    } as any;

    it('updates the authenticated user profile', async () => {
      const updatedUser = {
        id: request.user.id,
        handle: 'testuser',
        displayName: 'Updated Name',
        bio: 'Hello',
      };

      usersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateMyProfile(request, {
        displayName: 'Updated Name',
        bio: 'Hello',
      });

      expect(usersService.updateProfile).toHaveBeenCalledWith(
        request.user.id,
        {
          displayName: 'Updated Name',
          bio: 'Hello',
        },
      );
      expect(result).toEqual({ item: updatedUser });
    });

    it('rejects a request without an authenticated user', async () => {
      await expect(
        controller.updateMyProfile({} as any, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(usersService.updateProfile).not.toHaveBeenCalled();
    });

    it('returns not found when the profile cannot be updated', async () => {
      usersService.updateProfile.mockResolvedValue(null);

      await expect(
        controller.updateMyProfile(request, {
          displayName: 'Updated Name',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
