import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUser: Partial<User> = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.DEVELOPER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn().mockReturnValue(mockUser),
    save: jest.fn().mockResolvedValue(mockUser),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return a token', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-password');

      const result = await service.register({
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
      });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          email: 'test@example.com',
          role: UserRole.DEVELOPER,
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepo.findOne.mockResolvedValueOnce(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          name: 'Test',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return a token for valid credentials', async () => {
      mockRepo.findOne.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockRepo.findOne.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockRepo.findOne.mockResolvedValueOnce(mockUser);
      const result = await service.findById('user-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual(mockUser);
    });
  });
});
