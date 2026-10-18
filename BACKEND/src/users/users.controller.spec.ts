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
    updateProfile: jest.fn<(...args: any[]) => Promise<any>>(),
    getUserById: jest.fn<(...args: any[]) => Promise<any>>(),
    listProfileMedia: jest.fn<(...args: any[]) => Promise<any>>(),
    setFollow: jest.fn<(...args: any[]) => Promise<any>>(),
    listFollowers: jest.fn<(...args: any[]) => Promise<any>>(),
    listFollowing: jest.fn<(...args: any[]) => Promise<any>>(),
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

      expect(usersService.updateProfile).toHaveBeenCalledWith(request.user.id, {
        displayName: 'Updated Name',
        bio: 'Hello',
      });
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

  describe('followUser and unfollowUser', () => {
    const request = {
      user: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
    } as any;

    const targetId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    it('follows a user', async () => {
      const result = {
        following: true,
        followerCount: 3,
        followingCount: 2,
      };
      usersService.setFollow.mockResolvedValue(result);

      await expect(controller.followUser(targetId, request)).resolves.toEqual(
        result,
      );

      expect(usersService.setFollow).toHaveBeenCalledWith(
        request.user.id,
        targetId,
        true,
      );
    });

    it('unfollows a user', async () => {
      const result = {
        following: false,
        followerCount: 2,
        followingCount: 1,
      };
      usersService.setFollow.mockResolvedValue(result);

      await expect(controller.unfollowUser(targetId, request)).resolves.toEqual(
        result,
      );

      expect(usersService.setFollow).toHaveBeenCalledWith(
        request.user.id,
        targetId,
        false,
      );
    });

    it('rejects follow without an authenticated user', async () => {
      await expect(
        controller.followUser(targetId, {} as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(usersService.setFollow).not.toHaveBeenCalled();
    });

    it('rejects unfollow without an authenticated user', async () => {
      await expect(
        controller.unfollowUser(targetId, {} as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(usersService.setFollow).not.toHaveBeenCalled();
    });

    it('rejects an invalid target UUID', async () => {
      await expect(
        controller.followUser('not-a-uuid', request),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(usersService.setFollow).not.toHaveBeenCalled();
    });
  });

  describe('listFollowers and listFollowing', () => {
    const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    const request = {
      query: {
        limit: '5',
      },
    } as any;

    const page = {
      items: [],
      nextCursor: null,
      hasMore: false,
    };

    it('lists followers with validated pagination', async () => {
      usersService.listFollowers.mockResolvedValue(page);

      await expect(controller.listFollowers(userId, request)).resolves.toEqual(
        page,
      );

      expect(usersService.listFollowers).toHaveBeenCalledWith(userId, null, 5);
    });

    it('lists following with validated pagination', async () => {
      usersService.listFollowing.mockResolvedValue(page);

      await expect(controller.listFollowing(userId, request)).resolves.toEqual(
        page,
      );

      expect(usersService.listFollowing).toHaveBeenCalledWith(userId, null, 5);
    });

    it('rejects invalid pagination parameters', async () => {
      await expect(
        controller.listFollowers(userId, {
          query: { limit: '100' },
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(usersService.listFollowers).not.toHaveBeenCalled();
    });

    it('rejects an invalid user UUID', async () => {
      await expect(
        controller.listFollowing('invalid-uuid', request),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(usersService.listFollowing).not.toHaveBeenCalled();
    });
  });
});
